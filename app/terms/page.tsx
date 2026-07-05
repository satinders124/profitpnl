import type { Metadata } from "next";
import { LegalList, LegalSection, LegalShell } from "@/components/legal/LegalShell";

const title = "Terms of Service";
const description = "The rules for using ProfitPnL, including accounts, subscriptions, trading journal data, AI features, public certificates, and acceptable use.";

export const metadata: Metadata = {
  title: `${title} | ProfitPnL`,
  description,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalShell title={title} description={description}>
      <LegalSection title="1. Agreement">
        <p>
          These Terms of Service govern your access to and use of ProfitPnL, including our website, trading journal, calculators, AI features, public certificates, and related services. By creating an account or using the service, you agree to these Terms.
        </p>
      </LegalSection>

      <LegalSection title="2. Trading and financial disclaimer">
        <p>
          ProfitPnL is a journaling, analytics, education, and productivity tool. We do not provide financial, investment, tax, legal, or brokerage advice. Trading involves significant risk and you are solely responsible for your trading decisions.
        </p>
        <p>
          Analytics, AI feedback, calculators, and certificates are informational only. They do not guarantee performance, profitability, funding, or future results.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts and security">
        <LegalList
          items={[
            "You must provide accurate account information and keep your login credentials secure.",
            "You are responsible for activity that occurs under your account.",
            "You must notify us if you believe your account has been compromised.",
            "We may suspend or terminate accounts that violate these Terms, abuse the service, or create security risk.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. User content and trading data">
        <p>
          You retain ownership of trading journal entries, notes, screenshots, certificates, and other content you submit. You grant ProfitPnL a limited license to process, store, display, analyze, and transmit that content as needed to provide and improve the service.
        </p>
        <p>
          You are responsible for ensuring that data you upload or enter is lawful and that you have the right to use it.
        </p>
      </LegalSection>

      <LegalSection title="5. Public certificates and sharing">
        <p>
          When you generate a certificate, ProfitPnL creates a snapshot from your journal data based on your selected account/date range and privacy settings. Public certificates can be viewed by anyone with the link until revoked.
        </p>
        <LegalList
          items={[
            "Certificates are journal-verified snapshots, not broker-audited statements.",
            "You must not use certificates to mislead others, impersonate another trader, or make false claims.",
            "Revoking a certificate disables the public ProfitPnL page but cannot remove screenshots, cached copies, or reposts outside our control.",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Subscriptions, trials, and billing">
        <p>
          Paid features may be offered through subscriptions, trials, or promotional access. Billing is processed by Stripe or another payment provider. Prices, plan features, and billing intervals may change, but we will make reasonable efforts to provide notice where required.
        </p>
        <p>
          You are responsible for canceling subscriptions before renewal if you do not want to continue. See our Refund Policy for more details.
        </p>
      </LegalSection>

      <LegalSection title="7. Acceptable use">
        <LegalList
          items={[
            "Do not access or attempt to access another user's account or data.",
            "Do not reverse engineer, scrape, overload, or disrupt the service.",
            "Do not upload malicious code, spam, or illegal content.",
            "Do not use ProfitPnL to make misleading investment claims or guarantee returns.",
            "Do not bypass plan limits, authentication, payment systems, or security controls.",
          ]}
        />
      </LegalSection>

      <LegalSection title="8. AI and automated outputs">
        <p>
          AI-generated output can be incomplete, inaccurate, or unsuitable for your situation. You are responsible for reviewing and validating all AI output before relying on it. AI feedback is not financial advice.
        </p>
      </LegalSection>

      <LegalSection title="9. Availability and changes">
        <p>
          We aim to provide a reliable service, but we do not guarantee uninterrupted availability. We may modify, suspend, or discontinue features as needed for maintenance, security, legal compliance, or product development.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitation of liability">
        <p>
          To the maximum extent permitted by law, ProfitPnL is not liable for trading losses, lost profits, loss of data, indirect damages, consequential damages, or decisions made using the service. Your sole remedy for dissatisfaction with the service is to stop using it.
        </p>
      </LegalSection>

      <LegalSection title="11. Termination">
        <p>
          You may stop using ProfitPnL at any time. We may suspend or terminate access if you violate these Terms, create risk, or use the service unlawfully. Some provisions, including disclaimers, limitations of liability, and payment obligations, survive termination.
        </p>
      </LegalSection>

      <LegalSection title="12. Governing law">
        <p>
          Unless a different jurisdiction is required by applicable law, these Terms are governed by the laws of Victoria, Australia. Disputes will be handled in courts with appropriate jurisdiction in Victoria, Australia.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <p>
          Questions about these Terms can be sent to <a className="text-gold hover:underline" href="mailto:hello@profitpnl.com">hello@profitpnl.com</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
