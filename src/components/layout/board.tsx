"use client";

import { useCallback, useEffect, useState } from "react";
import type { TaskStatus } from "@/lib/tasks";
import { useBoardStore } from "@/store/board";
import { Assignee } from "./assignee";
import { BoardDndProvider } from "./board-dnd";
import { Section } from "./section";

const columns: { status: TaskStatus; title: string }[] = [
  { status: "todo", title: "Todo" },
  { status: "in-progress", title: "In Progress" },
  { status: "done", title: "Done" },
  { status: "backlog", title: "Backlog" },
];

function BoardColumn({ status, title }: { status: TaskStatus; title: string }) {
  const tasks = useBoardStore((state) => state[status]);
  const loading = useBoardStore((state) => state.loading);

  return (
    <div className="flex h-full min-h-0 w-96 shrink-0">
      <Section
        status={status}
        title={title}
        completed={tasks.length}
        total={tasks.length}
        loading={loading}
        tasks={tasks}
      />
    </div>
  );
}

export function Board() {
  const fetchBoard = useBoardStore((state) => state.fetchBoard);
  const moveTask = useBoardStore((state) => state.moveTask);
  const updateTask = useBoardStore((state) => state.updateTask);
  const error = useBoardStore((state) => state.error);
  const [dragError, setDragError] = useState<string | null>(null);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const handleDrop = useCallback(async (taskId: string, status: TaskStatus, index: number) => {
    setDragError(null);
    const patches = moveTask(taskId, status, index);
    if (patches.length === 0) return;

    try {
      const savedTasks = await Promise.all(
        patches.map(async ({ id, changes }) => {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(changes),
          });

          if (!response.ok) {
            throw new Error(`Task update failed with ${response.status}`);
          }

          return response.json();
        })
      );

      savedTasks.forEach(updateTask);
    } catch (dropError) {
      setDragError(dropError instanceof Error ? dropError.message : "Failed to move task");
      await fetchBoard();
    }
  }, [fetchBoard, moveTask, updateTask]);

  return (
    <BoardDndProvider onDrop={handleDrop}>
      <main className="flex h-full min-h-0 flex-col gap-4 overflow-hidden rounded-md bg-board p-6">
        <Assignee name="Avinash Singh" />
        {(error || dragError) && <p className="text-sm text-destructive">{error ?? dragError}</p>}
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto overflow-y-hidden">
          {columns.map((column) => (
            <BoardColumn key={column.status} {...column} />
          ))}
        </div>
      </main>
    </BoardDndProvider>
  );
}
