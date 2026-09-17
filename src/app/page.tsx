import { Board } from "@/components/layout/board";
import { Sidebar } from "@/components/layout/sidebar";
import { firstValue, parsePriority, type SearchParams } from "@/lib/utils";

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Read filters on the server so a refresh or shared URL restores the same view.
  const query = await searchParams;
  const initialSearch = firstValue(query.search) ?? "";
  const initialAssignee = firstValue(query.assignee)?.trim() || null;
  const initialPriority = parsePriority(firstValue(query.priority));

  return (
    <div className="grid h-dvh max-h-dvh min-h-0 grid-cols-1 overflow-hidden bg-background p-2 font-sans md:grid-cols-[240px_minmax(0,1fr)]">
      <Sidebar />
      <Board
        initialSearch={initialSearch}
        initialAssignee={initialAssignee}
        initialPriority={initialPriority}
      />
    </div>
  );
}
