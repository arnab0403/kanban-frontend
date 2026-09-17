export type TaskStatus = "todo" | "in-progress" | "done" | "backlog";
export type TaskPriority = "low" | "medium" | "high";

// Shared task shape returned by the REST API and SSE stream.
export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  assignee: string;
  status: TaskStatus;
  position: number;
  version: number;
  updatedAt: string;
}

// Apply every active filter with AND semantics. searchQuery is normalized by
// the caller once so it does not need to be lowercased for every task.
export function matchesTaskFilters(
  task: TaskRecord,
  selectedAssignee: string | null,
  selectedPriority: TaskPriority | null,
  searchQuery: string,
) {
  const matchesAssignee =
    selectedAssignee === null || task.assignee === selectedAssignee;
  const matchesPriority =
    selectedPriority === null || task.priority === selectedPriority;
  const matchesSearch =
    searchQuery.length === 0 || task.title.toLowerCase().includes(searchQuery);

  return matchesAssignee && matchesPriority && matchesSearch;
}
