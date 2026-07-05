import type { Metadata } from "next";
import { LegalList, LegalSection, LegalShell } from "@/components/legal/LegalShell";

const title = "Privacy Policy";
const description = "How ProfitPnL collects, uses, stores, and protects information when you use our trading journal, calculators, certificates, and related services.";

export const metadata: Metadata = {
  title: `${title} | ProfitPnL`,
  description,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalShell title={title} description={description}>
      <LegalSection title="1. Overview">
        <p>
          ProfitPnL provides trading journal, analytics, calculator, certificate, and related productivity tools for traders. This Privacy Policy explains what information we collect and how we use it. By using ProfitPnL, you agree to this policy.
        </p>
        <p>
          This policy is a practical template for transparency and should not be treated as legal advice. If your business structure or regulatory obligations change, have a qualified lawyer review it.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <LegalList
          items={[
            "Account information such as email address, display name, authentication identifiers, and profile settings.",
            "Trading journal data you enter or import, including trades, instruments, dates, P&L, R-multiples, notes, tags, screenshots/links, account names, strategy details, and psychology journal entries.",
            "Certificate data when you generate a public trading performance certificate, including the selected date range, privacy preferences, and calculated snapshot metrics.",
            "Payment and subscription information handled through our payment provider, Stripe. We do not store full card numbers on ProfitPnL servers.",
            "Technical and usage data such as device/browser information, IP address, log data, feature usage, error events, and approximate location derived from technical data.",
            "Communications you send to us, including support requests, feedback, and waitlist/contact submissions.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. How we use information">
        <LegalList
          items={[
            "To provide, maintain, secure, and improve ProfitPnL.",
            "To calculate analytics, dashboards, trading metrics, certificates, and AI-assisted insights.",
            "To authenticate users and prevent unauthorized access.",
            "To process subscriptions, trials, billing, and account management.",
            "To respond to support requests and send service-related communications.",
            "To detect abuse, enforce our Terms, troubleshoot bugs, and improve performance.",
            "To send product updates or marketing emails where permitted. You can opt out of marketing emails at any time.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Public certificates and shared links">
        <p>
          If you create a public certificate or share link, the selected snapshot can be viewed by anyone with the link. Public certificates may include metrics such as win rate, profit factor, net P&L, return percentage, R-multiple statistics, account name, and display name depending on your privacy choices.
        </p>
        <p>
          You can revoke public certificates from your account. Revocation stops the public certificate page from being displayed, but copies, screenshots, cached versions, or links already shared by others may still exist outside our control.
        </p>
      </LegalSection>

      <LegalSection title="5. AI features">
        <p>
          ProfitPnL may process your journal data through AI systems to generate summaries, coaching feedback, and analytics. We send only the information required to provide the feature. Do not enter sensitive personal information in trade notes or journal entries unless you are comfortable with it being processed as part of the service.
        </p>
      </LegalSection>

      <LegalSection title="6. Service providers">
        <p>We may use trusted third-party providers to operate ProfitPnL, including:</p>
        <LegalList
          items={[
            "Supabase or similar infrastructure providers for database, authentication, and storage.",
            "Stripe for payments and subscription management.",
            "Email providers such as SendGrid for transactional and service emails.",
            "AI providers for AI coaching and analysis features.",
            "Hosting, analytics, monitoring, and security providers.",
          ]}
        />
        <p>These providers may process information only as needed to provide their services to us.</p>
      </LegalSection>

      <LegalSection title="7. Data security">
        <p>
          We use reasonable technical and organizational measures to protect user data, including authentication, access controls, HTTPS, and restricted server-side operations. No internet service can guarantee absolute security, and you are responsible for keeping your login credentials secure.
        </p>
      </LegalSection>

      <LegalSection title="8. Data retention">
        <p>
          We keep information for as long as needed to provide the service, comply with legal obligations, resolve disputes, enforce agreements, and maintain backups. You may request deletion of your account, subject to legitimate retention requirements such as billing, fraud prevention, or legal compliance.
        </p>
      </LegalSection>

      <LegalSection title="9. Your choices and rights">
        <LegalList
          items={[
            "You can update profile settings inside your account.",
            "You can edit or delete trading journal data where the product allows.",
            "You can revoke public certificates.",
            "You can unsubscribe from marketing emails.",
            "Depending on your location, you may have rights to access, correct, delete, restrict, or export personal information.",
          ]}
        />
      </LegalSection>

      <LegalSection title="10. International users">
        <p>
          ProfitPnL may be accessed globally. Your information may be processed in countries other than your own, where privacy laws may differ. We take reasonable steps to protect information according to this policy.
        </p>
      </LegalSection>

      <LegalSection title="11. Children">
        <p>
          ProfitPnL is not intended for children under 16. We do not knowingly collect personal information from children. If you believe a child has provided us information, contact us so we can take appropriate action.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          For privacy questions or data requests, contact us at <a className="text-gold hover:underline" href="mailto:hello@profitpnl.com">hello@profitpnl.com</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
