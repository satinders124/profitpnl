import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  generateOtp,
  hashOtp,
  normalizeEmail,
  otpDocId,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
} from "@/lib/otp";
import sgMail from "@sendgrid/mail";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    const { name, email, password } = await req.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email is required." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const cleanEmail = normalizeEmail(email);

    // Reject if an account already exists for this email.
    try {
      await adminAuth.getUserByEmail(cleanEmail);
      return NextResponse.json(
        { error: "An account with this email already exists. Try logging in." },
        { status: 409 }
      );
    } catch {
      // No existing user — good, continue.
    }

    const docId = otpDocId(cleanEmail);
    const ref = adminDb.collection("pendingSignups").doc(docId);
    const existing = await ref.get();

    if (existing.exists) {
      const data = existing.data() as { lastSentAt?: number };
      const elapsed = Date.now() - (data.lastSentAt || 0);
      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
        return NextResponse.json(
          { error: `Please wait ${waitSec}s before requesting a new code.` },
          { status: 429 }
        );
      }
    }

    const code = generateOtp();

    await ref.set({
      name: name.trim(),
      email: cleanEmail,
      password,
      otpHash: hashOtp(code),
      attempts: 0,
      createdAt: Date.now(),
      lastSentAt: Date.now(),
      expiresAt: Date.now() + OTP_TTL_MS,
    });

    await sendOtpEmail(cleanEmail, name.trim(), code);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-otp error:", err);
    return NextResponse.json(
      { error: "Could not send verification code. Please try again." },
      { status: 500 }
    );
  }
}

async function sendOtpEmail(email: string, name: string, code: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error(
      "SendGrid is not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL."
    );
  }

  sgMail.setApiKey(apiKey);

  await sgMail.send({
    to: email,
    from: { email: fromEmail, name: "ProfitPnL" },
    subject: `${code} is your ProfitPnL verification code`,
    text: `Hi ${name || "there"},\n\nYour ProfitPnL verification code is: ${code}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: otpEmailHtml(name, code),
  });
}

function otpEmailHtml(name: string, code: string) {
  return `
  <div style="background:#080810;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:420px;margin:0 auto;background:#161628;border:1px solid #1E1E38;border-radius:20px;padding:28px;color:#F0F0FF;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#F0B429,#C8961E);color:#080810;font-weight:900;display:flex;align-items:center;justify-content:center;">P</div>
        <span style="font-weight:900;font-size:16px;">ProfitPnL</span>
      </div>
      <h1 style="font-size:18px;margin:0 0 6px;">Verify your email</h1>
      <p style="font-size:13px;color:#A0A0C0;line-height:1.6;margin:0 0 20px;">
        Hi ${escapeHtml(name) || "there"}, use the code below to finish creating your ProfitPnL account.
      </p>
      <div style="background:#0D0D1A;border:1px solid #1E1E38;border-radius:14px;padding:18px;text-align:center;margin-bottom:20px;">
        <span style="font-size:32px;font-weight:900;letter-spacing:10px;color:#F0B429;">${code}</span>
      </div>
      <p style="font-size:12px;color:#5A5A80;line-height:1.6;margin:0;">
        This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  </div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
