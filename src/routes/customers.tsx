import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { ContactsBrowser } from "@/components/ContactsBrowser";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — ProfitAI" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  return (
    <AppLayout>
      <div className="mb-4">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Phonebook
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Customers</h1>
      </div>
      <ContactsBrowser kind="customer" />
    </AppLayout>
  );
}