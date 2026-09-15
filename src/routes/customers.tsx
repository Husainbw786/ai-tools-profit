import { createFileRoute } from "@tanstack/react-router";
import { ContactsPage } from "@/components/ContactsPage";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — ProfitAI" }] }),
  component: () => <ContactsPage kind="customer" />,
});
