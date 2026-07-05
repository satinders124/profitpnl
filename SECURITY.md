# 🛡️ ProfitPnL Security Operations (SecOps) Protocol

This document outlines the mandatory security maintenance routine for the ProfitPnL application. To protect user data and maintain the integrity of our API integrations (Anthropic, Stripe, SendGrid), the following checklists must be followed.

---

## 📅 Daily Checklist (Health Check)
*Focus: Monitoring, Cost Control, and Abuse Detection. (Estimated time: 10-15 mins)*

- [ ] **Check AI Spend:** Log into the **Anthropic Console**. Monitor for sudden spikes in token usage, which may indicate a leak or prompt injection abuse.
- [ ] **Monitor Email Reputation:** Check the **SendGrid Dashboard**. Look for spikes in "Bounce" or "Spam Report" rates, which indicate potential abuse of the waitlist.
- [ ] **Review Error Logs:** Check **Vercel Logs** for a high volume of `401 Unauthorized` or `403 Forbidden` errors, which often signal automated scanning for API vulnerabilities.
- [ ] **Verify Webhook Health:** Check the **Stripe Dashboard** $\rightarrow$ Developers $\rightarrow$ Webhooks to ensure no critical payment events are failing.

---

## 🗓️ Weekly Checklist (Hardening)
*Focus: Updates, Audits, and Logic Review. (Estimated time: 1 hour)*

- [ ] **Dependency Audit:** Run `npm audit` locally. Update any packages with "High" or "Critical" vulnerabilities immediately.
- [ ] **Supabase Log Analysis:** Review **Supabase $\rightarrow$ Reports $\rightarrow$ API logs** for unusual request patterns or single-IP abuse.
- [ ] **RLS Verification:** For any new tables added, verify that **Row Level Security (RLS)** is enabled and correctly configured.
- [ ] **AI Quality Audit:** Sample AI Coach conversations to ensure the AI is adhering to the server-side system prompt and not leaking internal instructions.
- [ ] **Flow Testing:** Manually test the **Account Deletion** and **Password Reset** flows to ensure they are functioning and secure.

---

## 🌙 Monthly/Quarterly Checklist (Deep Clean)
*Focus: Strategic Security and Rotation. (Estimated time: 3-4 hours)*

- [ ] **Secret Rotation:** Rotate the `ANTHROPIC_API_KEY` and `SENDGRID_API_KEY` to limit the window of opportunity for leaked keys.
- [ ] **Access Audit:** Review users/permissions for **GitHub, Vercel, Stripe, and Supabase**. Remove unnecessary access.
- [ ] **Backup Validation:** Verify Supabase backups are running and perform a test restore to a staging environment.
- [ ] **Penetration Testing:** Perform a "Red Team" or "Black Hat" exercise to attempt to bypass Pro plan restrictions or access other users' data.

---

## 🚨 "RED ALERT" Protocol (Emergency Response)
In the event of a confirmed breach or massive cost spike:

1.  **Immediate Key Rotation:** Generate new keys in Anthropic/SendGrid/Stripe and update Vercel environment variables immediately.
2.  **Session Revocation:** Use Supabase to revoke active sessions or force-logout suspected malicious users.
3.  **Webhook Audit:** Verify no unauthorized webhook endpoints have been added to Stripe.
4.  **Incident Communication:** If user data is compromised, notify affected users transparently and immediately.
