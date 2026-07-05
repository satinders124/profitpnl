import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";
import {
  calculateCertificateMetrics,
  generatePublicId,
  mapTradeRows,
  normalizePrivacy,
  signCertificate,
  type CertificateSnapshot,
} from "@/lib/certificates";

export const runtime = "nodejs";

type CreateCertificateBody = {
  title?: string;
  accountName?: string;
  periodStart?: string;
  periodEnd?: string;
  isAnonymous?: boolean;
  privacy?: Partial<CertificateSnapshot["privacy"]>;
};

function isIsoDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

function tableSetupError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.includes("certificates") || message.includes("schema cache") || message.includes("does not exist");
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const uid = user.id;
    const body = (await req.json().catch(() => ({}))) as CreateCertificateBody;

    const periodStart = body.periodStart;
    const periodEnd = body.periodEnd;

    if (!isIsoDate(periodStart) || !isIsoDate(periodEnd)) {
      return NextResponse.json({ error: "Choose a valid start and end date." }, { status: 400 });
    }

    if (new Date(`${periodStart}T00:00:00`) > new Date(`${periodEnd}T23:59:59`)) {
      return NextResponse.json({ error: "Start date must be before end date." }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, currency, initial_account_size")
      .eq("id", uid)
      .single();

    if (profileError) {
      console.error("Certificate profile load error:", profileError);
      return NextResponse.json({ error: "Could not load profile." }, { status: 500 });
    }

    const accountName = (body.accountName || "").trim();
    let startingBalance = Number(profile?.initial_account_size) || null;

    if (accountName) {
      const { data: account } = await supabase
        .from("accounts")
        .select("name, starting_balance, size")
        .eq("user_id", uid)
        .eq("name", accountName)
        .maybeSingle();

      if (account) {
        startingBalance = Number(account.starting_balance || account.size) || startingBalance;
      }
    }

    let tradeQuery = supabase
      .from("trades")
      .select("*")
      .eq("user_id", uid)
      .gte("date", periodStart)
      .lte("date", periodEnd)
      .order("date", { ascending: true });

    if (accountName) {
      tradeQuery = tradeQuery.eq("account", accountName);
    }

    const { data: tradeRows, error: tradeError } = await tradeQuery;

    if (tradeError) {
      console.error("Certificate trades load error:", tradeError);
      return NextResponse.json({ error: "Could not load trades." }, { status: 500 });
    }

    const trades = mapTradeRows(tradeRows || []);
    const metrics = calculateCertificateMetrics(
      trades,
      startingBalance,
      profile?.currency || "USD"
    );

    if (metrics.tradeCount <= 0) {
      return NextResponse.json(
        { error: "No closed trades found for this account/date range." },
        { status: 400 }
      );
    }

    const publicId = generatePublicId();
    const createdAt = new Date().toISOString();
    const title = (body.title || "Trading Performance Certificate").trim().slice(0, 90);
    const privacy = normalizePrivacy(body.privacy);
    const isAnonymous = !!body.isAnonymous || !privacy.showDisplayName;

    const snapshotWithoutHash: Omit<CertificateSnapshot, "certificate_hash"> = {
      public_id: publicId,
      user_id: uid,
      account_name: accountName || null,
      title,
      display_name: isAnonymous ? null : profile?.display_name || user.email?.split("@")[0] || "Trader",
      is_anonymous: isAnonymous,
      status: "active",
      data_source: "journal",
      period_start: periodStart,
      period_end: periodEnd,
      metrics,
      privacy,
      created_at: createdAt,
      revoked_at: null,
    };

    const certificateHash = signCertificate(snapshotWithoutHash);

    const { data: inserted, error: insertError } = await supabase
      .from("certificates")
      .insert({
        public_id: publicId,
        user_id: uid,
        account_name: accountName || null,
        title,
        display_name: snapshotWithoutHash.display_name,
        is_anonymous: isAnonymous,
        visibility: "public",
        status: "active",
        data_source: "journal",
        period_start: periodStart,
        period_end: periodEnd,
        metrics,
        privacy,
        certificate_hash: certificateHash,
        created_at: createdAt,
      })
      .select("public_id")
      .single();

    if (insertError) {
      console.error("Certificate insert error:", insertError);
      const message = tableSetupError(insertError)
        ? "Certificates database table is not set up yet. Run the Supabase migration in supabase/migrations."
        : "Could not create certificate.";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      publicId: inserted.public_id,
      url: `/cert/${inserted.public_id}`,
    });
  } catch (error) {
    console.error("Certificate create error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not create certificate." }, { status: 500 });
  }
}
