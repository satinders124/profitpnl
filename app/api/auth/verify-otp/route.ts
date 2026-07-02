import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { hashOtp, normalizeEmail, otpDocId, OTP_MAX_ATTEMPTS } from "@/lib/otp";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    const { email, code } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Enter the 6-digit code sent to your email." },
        { status: 400 }
      );
    }

    const cleanEmail = normalizeEmail(email);
    const docId = otpDocId(cleanEmail);
    const ref = adminDb.collection("pendingSignups").doc(docId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "No pending signup found. Please start again." },
        { status: 404 }
      );
    }

    const data = snap.data() as {
      name: string;
      email: string;
      password: string;
      otpHash: string;
      attempts: number;
      expiresAt: number;
    };

    if (Date.now() > data.expiresAt) {
      await ref.delete();
      return NextResponse.json(
        { error: "This code has expired. Please request a new one." },
        { status: 410 }
      );
    }

    if (data.attempts >= OTP_MAX_ATTEMPTS) {
      await ref.delete();
      return NextResponse.json(
        { error: "Too many incorrect attempts. Please request a new code." },
        { status: 429 }
      );
    }

    if (hashOtp(code) !== data.otpHash) {
      await ref.update({ attempts: FieldValue.increment(1) });
      const remaining = OTP_MAX_ATTEMPTS - (data.attempts + 1);
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
              : "Incorrect code. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // Code is correct — create the real Firebase Auth user now.
    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.name,
      emailVerified: true,
    });

    await adminDb.doc(`users/${userRecord.uid}`).set({
      name: data.name,
      email: data.email,
      plan: "Free Plan",
      emailVerified: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    await ref.delete();

    // Issue a custom token so the client can sign the user straight in.
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    return NextResponse.json({ ok: true, token: customToken });
  } catch (err) {
    console.error("verify-otp error:", err);
    return NextResponse.json(
      { error: "Could not verify code. Please try again." },
      { status: 500 }
    );
  }
}
