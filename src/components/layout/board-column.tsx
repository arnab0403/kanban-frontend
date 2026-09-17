"use client";

import { memo, useMemo } from "react";
import {
  matchesTaskFilters,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";
import { useBoardStore } from "@/store/board";
import { Section } from "./section";

interface BoardColumnProps {
  status: TaskStatus;
  title: string;
  selectedAssignee: string | null;
  selectedPriority: TaskPriority | null;
  searchQuery: string;
}

// memo prevents unrelated parent updates from rerendering an unchanged column.
export const BoardColumn = memo(function BoardColumn({
  status,
  title,
  selectedAssignee,
  selectedPriority,
  searchQuery,
}: BoardColumnProps) {
  // Each column subscribes only to its own status bucket. Structural sharing in
  // the store keeps this array stable when a different column changes.
  const tasks = useBoardStore((state) => state[status]);
  const loading = useBoardStore((state) => state.loading);

  // Recalculate visible tasks only when this column or an active filter changes.
  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) =>
        matchesTaskFilters(
          task,
          selectedAssignee,
          selectedPriority,
          searchQuery,
        ),
      ),
    [searchQuery, selectedAssignee, selectedPriority, tasks],
  );

  console.log("Board name is:", title); // Use this to check for unnecessary BoardColumn rerenders.

  return (
    <div className="flex h-full min-h-0 w-[calc(100vw-2.5rem)] max-w-96 shrink-0 snap-start sm:w-80 lg:w-96">
      {/* Append new tasks after the full column, including filtered-out tasks. */}
      <Section
        status={status}
        title={title}
        completed={visibleTasks.length}
        total={visibleTasks.length}
        loading={loading}
        tasks={visibleTasks}
        nextPosition={Math.max(0, ...tasks.map((task) => task.position)) + 1}
      />
    </div>
  );
});
