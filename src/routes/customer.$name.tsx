import { createFileRoute } from "@tanstack/react-router";
import { ContactDetail } from "@/components/ContactDetail";

export const Route = createFileRoute("/customer/$name")({
  head: ({ params }) => ({
    meta: [{ title: `${decodeURIComponent(params.name)} — ProfitAI` }],
  }),
  component: CustomerPage,
});

function CustomerPage() {
  const { name } = Route.useParams();
  return <ContactDetail kind="customer" name={decodeURIComponent(name)} />;
}
