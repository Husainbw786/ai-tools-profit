import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { ContactsDirectory } from "@/components/ContactsDirectory";
import { BackLink, PageTitle } from "@/components/primitives";

export const Route = createFileRoute("/contacts")({
  head: () => ({ meta: [{ title: "Contacts — ProfitAI" }] }),
  component: ContactsRoute,
});

function ContactsRoute() {
  return (
    <AppLayout>
      <BackLink to="/more" className="mt-6" />
      <PageTitle className="mt-4" title="Contacts" sub="All your dealers and customers" />
      <ContactsDirectory />
    </AppLayout>
  );
}
