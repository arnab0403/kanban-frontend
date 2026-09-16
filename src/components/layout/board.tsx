import { tasks, type TaskPriority, type TaskStatus } from "@/lib/tasks";
import { Assignee } from "./assignee";
import { Section } from "./section";

const columns: { status: TaskStatus; title: string }[] = [
  { status: "todo", title: "Todo" },
  { status: "in-progress", title: "In Progress" },
  { status: "done", title: "Done" },
  { status: "unfinished", title: "Unfinished" },
];

const priorityColors: Record<TaskPriority, string> = {
  low: "#38bdf8",
  medium: "#f59e0b",
  high: "#ef4444",
};

const assigneeColor = "#818cf8";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function Board() {
  return (
    <main className="flex h-full flex-col gap-4 rounded-md bg-board p-6">
      <Assignee name="Avinash Singh" />
      <div className="flex flex-1 gap-4 overflow-x-auto">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          return (
            <div key={column.status} className="w-96 shrink-0">
              <Section
                title={column.title}
                completed={columnTasks.length}
                total={columnTasks.length}
                tasks={columnTasks.map((task) => ({
                  id: `DEMO-${task.id}`,
                  title: task.title,
                  tags: [
                    { label: task.priority, color: priorityColors[task.priority] },
                    { label: task.assignee, color: assigneeColor },
                  ],
                  createdAt: formatDate(task.updatedAt),
                }))}
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}
