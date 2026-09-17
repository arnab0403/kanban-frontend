import { Board } from "@/components/layout/board";
import { Sidebar } from "@/components/layout/sidebar";
import type { TaskPriority } from "@/lib/tasks";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePriority(value: string | undefined): TaskPriority | null {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = await searchParams;
  const initialSearch = firstValue(query.search) ?? "";
  const initialAssignee = firstValue(query.assignee)?.trim() || null;
  const initialPriority = parsePriority(firstValue(query.priority));

  return (
    <div className="grid h-screen max-h-screen min-h-0 grid-cols-[240px_1fr] overflow-hidden bg-background p-2 font-sans">
      <Sidebar />
      <Board
        initialSearch={initialSearch}
        initialAssignee={initialAssignee}
        initialPriority={initialPriority}
      />
    </div>
  );
}
