import type { Metadata } from "next";
import { LegalList, LegalSection, LegalShell } from "@/components/legal/LegalShell";

const title = "Cookie Policy";
const description = "How ProfitPnL uses cookies and similar technologies for authentication, security, analytics, preferences, and product functionality.";

export const metadata: Metadata = {
  title: `${title} | ProfitPnL`,
  description,
  alternates: { canonical: "/cookie-policy" },
};

export default function CookiePolicyPage() {
  return (
    <LegalShell title={title} description={description}>
      <LegalSection title="1. What cookies are">
        <p>
          Cookies are small text files stored on your device by your browser. Similar technologies include local storage, session storage, pixels, and SDKs. They help websites remember users, keep sessions secure, and understand product usage.
        </p>
      </LegalSection>

      <LegalSection title="2. How ProfitPnL uses cookies">
        <LegalList
          items={[
            "Essential cookies and storage for login, authentication, security, and account access.",
            "Preference storage for settings such as theme, remembered email, dashboard choices, and app state.",
            "Analytics and performance tools to understand feature usage, improve product quality, and troubleshoot errors.",
            "Payment or subscription-related cookies used by providers such as Stripe during checkout and billing management.",
            "Marketing or attribution cookies if we run campaigns or measure conversions.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Third-party providers">
        <p>
          Third-party services such as Supabase, Stripe, hosting providers, analytics tools, email tools, and security tools may use cookies or similar technologies when their services are embedded or used in ProfitPnL.
        </p>
      </LegalSection>

      <LegalSection title="4. Managing cookies">
        <p>
          You can control cookies through your browser settings. Blocking essential cookies may prevent login, billing, dashboard features, or security protections from working correctly.
        </p>
      </LegalSection>

      <LegalSection title="5. Changes">
        <p>
          We may update this Cookie Policy as our product and providers change. The latest version will be posted on this page.
        </p>
      </LegalSection>

      <LegalSection title="6. Contact">
        <p>
          Questions about cookies can be sent to <a className="text-gold hover:underline" href="mailto:hello@profitpnl.com">hello@profitpnl.com</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
