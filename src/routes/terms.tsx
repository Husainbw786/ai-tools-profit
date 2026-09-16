import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ProfitAI" },
      { name: "description", content: "The terms you agree to when using ProfitAI." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="16 September 2026">
      <p>
        These terms cover your use of ProfitAI, the resale ledger at{" "}
        <span className="whitespace-nowrap">aitoolssubscriptions.online</span>. By creating an
        account you agree to them.
      </p>

      <LegalSection title="What the service is">
        <p>
          ProfitAI is a private bookkeeping tool. It lets you record what you bought, what you sold,
          to whom, at what price, and when a warranty runs out, then shows you the resulting profit.
          It is a place to write things down. It does not sell anything, process payments, or act as
          a party to any transaction between you and your customers.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          You are responsible for keeping access to your account secure and for everything recorded
          under it. Tell us promptly if you believe someone else has got in. Do not share one login
          between people who should not see each other&apos;s records. Use the workspace invite
          feature instead, which keeps each person&apos;s own ledger separate.
        </p>
        <p>
          One person, one account. Do not create an account on someone else&apos;s behalf without
          telling them.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>
            use the service for anything unlawful, or to record activity that is unlawful where you
            are;
          </li>
          <li>attempt to access records belonging to another account;</li>
          <li>probe, scan, or overload the service, or try to break its security;</li>
          <li>resell or rebrand the service as your own product;</li>
          <li>upload content that infringes someone else&apos;s rights.</li>
        </ul>
        <p>
          You are solely responsible for making sure that what you sell, and how you sell it,
          complies with the terms of whichever provider supplies the subscriptions and with the law
          that applies to you. ProfitAI records your business, it does not endorse or vet it.
        </p>
      </LegalSection>

      <LegalSection title="Your data">
        <p>
          The records you enter remain yours. We claim no ownership of them. We store and display
          them so the service can work, as described in the{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Availability">
        <p>
          The service is provided as it is, with no guarantee of uptime. It may be slow, briefly
          unavailable, or interrupted for maintenance. Features may change or be removed.
        </p>
        <p>
          Keep your own copy of anything you cannot afford to lose. The app can export your records,
          and you should use that from time to time.
        </p>
      </LegalSection>

      <LegalSection title="No warranty and limits">
        <p>
          ProfitAI comes without warranties of any kind, express or implied, including fitness for a
          particular purpose. Figures shown are calculated from what you entered. Check them before
          relying on them for tax, accounting, or any other decision. We are not your accountant.
        </p>
        <p>
          To the extent the law allows, we are not liable for lost profits, lost data, or indirect
          or consequential losses arising from your use of the service.
        </p>
      </LegalSection>

      <LegalSection title="Ending your use">
        <p>
          You can stop using ProfitAI and ask for your account to be deleted at any time. We may
          suspend or close an account that breaks these terms, or that puts the service or other
          users at risk. Where it is reasonable to do so, we will tell you why.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          We may update these terms. The date at the top shows when they last changed. Continuing to
          use the service after a change means you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these terms go to{" "}
          <a href="mailto:husainhackerrank@gmail.com">husainhackerrank@gmail.com</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
