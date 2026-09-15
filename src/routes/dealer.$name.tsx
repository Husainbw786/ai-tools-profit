import { createFileRoute } from "@tanstack/react-router";
import { ContactDetail } from "@/components/ContactDetail";

export const Route = createFileRoute("/dealer/$name")({
  head: ({ params }) => ({
    meta: [{ title: `${decodeURIComponent(params.name)} — ProfitAI` }],
  }),
  component: DealerPage,
});

function DealerPage() {
  const { name } = Route.useParams();
  return <ContactDetail kind="dealer" name={decodeURIComponent(name)} />;
}
