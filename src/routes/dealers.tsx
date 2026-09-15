import { createFileRoute } from "@tanstack/react-router";
import { ContactsPage } from "@/components/ContactsPage";

export const Route = createFileRoute("/dealers")({
  head: () => ({ meta: [{ title: "Dealers — ProfitAI" }] }),
  component: () => <ContactsPage kind="dealer" />,
});
