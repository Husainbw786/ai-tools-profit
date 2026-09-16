import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ProfitAI" },
      {
        name: "description",
        content: "How ProfitAI collects, stores and uses your data.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="16 September 2026">
      <p>
        ProfitAI is a private record-keeping tool for tracking subscription resales. This policy
        explains what it stores, why, and who can see it. It applies to the app at{" "}
        <span className="whitespace-nowrap">aitoolssubscriptions.online</span>.
      </p>

      <LegalSection title="What we collect">
        <p>Two kinds of information, and nothing else.</p>
        <ul>
          <li>
            <strong>Account details.</strong> When you sign in with Google we receive your email
            address, your name, and your profile picture. If you sign in with an email and password
            instead, we store only your email address and an encrypted password hash.
          </li>
          <li>
            <strong>The records you enter.</strong> Sale entries, product names, buying and selling
            prices, warranty dates, payments, customer and dealer names, saved links, and any notes
            you type. This is data you choose to put in.
          </li>
        </ul>
        <p>
          We do not collect analytics, advertising identifiers, or location data. There are no
          third-party trackers on the site.
        </p>
      </LegalSection>

      <LegalSection title="What we do with it">
        <p>
          Your records are used to display your dashboard, totals, and history back to you. Your
          email address is used to identify your account, to let workspace owners invite you by
          email, and to contact you about the service if something goes wrong.
        </p>
        <p>We do not sell your data, and we do not use it to train any model.</p>
      </LegalSection>

      <LegalSection title="Google sign-in">
        <p>
          Signing in with Google requests only the basic profile scopes: your email address, your
          basic profile information, and OpenID. ProfitAI cannot read your Gmail, your Drive files,
          your contacts, or your calendar, and it never asks for permission to.
        </p>
        <p>
          Google tells us who you are so we can create or find your account. We never see your
          Google password.
        </p>
      </LegalSection>

      <LegalSection title="Who can see your records">
        <p>
          By default, only you. Every record is tagged with your account and protected by row-level
          security rules in the database, so one signed-in user cannot read another user&apos;s
          rows.
        </p>
        <p>
          The one exception is one you create yourself. If you invite someone into a shared
          workspace, that person can see the links and shared ledger entries in that workspace, at
          the permission level you gave them. You can remove them at any time.
        </p>
      </LegalSection>

      <LegalSection title="Where it is stored">
        <p>We rely on a small number of service providers to run the app.</p>
        <ul>
          <li>
            <strong>Supabase</strong> hosts the database and handles sign-in.
          </li>
          <li>
            <strong>Vercel</strong> hosts and serves the website.
          </li>
          <li>
            <strong>Google</strong> processes the sign-in itself when you choose that option.
          </li>
        </ul>
        <p>
          Each of these can technically access data on our behalf in the course of providing their
          service. None of them are permitted to use it for anything else.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          Your records stay until you delete them or ask us to close your account. Archived sales
          remain in your account until you remove them, because the point of archiving is to keep
          the history.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>
          You can edit or delete any record from inside the app at any time. You can also ask us to
          delete your entire account and everything in it. Write to the address below and we will
          action it, normally within a few days.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          Traffic is encrypted in transit. Access to records is enforced per-account at the database
          level rather than only in the interface. No system is perfect, so please use a strong,
          unique password if you sign in with email.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          ProfitAI is not intended for anyone under 16, and we do not knowingly collect their data.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If this policy changes in a way that matters, the date at the top will change and we will
          note it in the app.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions, corrections, or deletion requests go to{" "}
          <a href="mailto:husainhackerrank@gmail.com">husainhackerrank@gmail.com</a>.
        </p>
      </LegalSection>

      <p className="pt-2">
        See also the <Link to="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
