"use client";

import { useEffect } from "react";
import type { TaskPriority, TaskStatus } from "@/lib/tasks";
import { useBoardStore } from "@/store/board";
import { Assignee } from "./assignee";
import { Section } from "./section";

const columns: { status: TaskStatus; title: string }[] = [
  { status: "todo", title: "Todo" },
  { status: "in-progress", title: "In Progress" },
  { status: "done", title: "Done" },
  { status: "backlog", title: "Backlog" },
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

function BoardColumn({ status, title }: { status: TaskStatus; title: string }) {
  const tasks = useBoardStore((state) => state[status]);
  const loading = useBoardStore((state) => state.loading);

  return (
    <div className="w-96 shrink-0">
      <Section
        title={title}
        completed={tasks.length}
        total={tasks.length}
        loading={loading}
        tasks={tasks.map((task) => ({
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
}

export function Board() {
  const fetchBoard = useBoardStore((state) => state.fetchBoard);
  const error = useBoardStore((state) => state.error);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  return (
    <main className="flex h-full flex-col gap-4 rounded-md bg-board p-6">
      <Assignee name="Avinash Singh" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-1 gap-4 overflow-x-auto">
        {columns.map((column) => (
          <BoardColumn key={column.status} {...column} />
        ))}
      </div>
    </main>
  );
}
