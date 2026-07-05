import type { Metadata } from "next";
import { LegalList, LegalSection, LegalShell } from "@/components/legal/LegalShell";

const title = "Refund Policy";
const description = "ProfitPnL refund, cancellation, subscription, and trial policy for paid plans.";

export const metadata: Metadata = {
  title: `${title} | ProfitPnL`,
  description,
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <LegalShell title={title} description={description}>
      <LegalSection title="1. Subscriptions">
        <p>
          ProfitPnL may offer paid subscriptions, trials, or promotional access. Subscription billing is handled by Stripe or another payment provider. Subscription fees are charged according to the plan and billing cycle you choose at checkout.
        </p>
      </LegalSection>

      <LegalSection title="2. Cancellations">
        <p>
          You can cancel your subscription from your account settings or billing portal. Cancellation prevents future renewals, but it does not automatically refund charges already processed unless required by law or approved by us.
        </p>
      </LegalSection>

      <LegalSection title="3. Trials">
        <p>
          If a free trial is offered, you are responsible for canceling before the trial converts to a paid plan if you do not want to be charged. Trial terms may vary by promotion.
        </p>
      </LegalSection>

      <LegalSection title="4. Refund requests">
        <p>
          Refunds are generally not guaranteed for digital subscription services once access has been provided. However, we may review refund requests case by case, especially where there has been accidental billing, duplicate billing, technical failure preventing access, or another fair reason.
        </p>
        <LegalList
          items={[
            "Refund requests should be made as soon as possible after the charge.",
            "We may ask for account, billing, and issue details to assess the request.",
            "Approved refunds are usually returned to the original payment method through the payment provider.",
            "Payment provider processing times may vary.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. No trading-loss refunds">
        <p>
          We do not provide refunds because of trading losses, failed prop-firm challenges, market outcomes, or decisions made using journal data, calculators, AI output, or analytics. ProfitPnL is a tool, not a guarantee of trading results.
        </p>
      </LegalSection>

      <LegalSection title="6. Contact">
        <p>
          To request billing help, contact <a className="text-gold hover:underline" href="mailto:hello@profitpnl.com">hello@profitpnl.com</a> with your account email and charge details.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
