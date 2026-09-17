"use client";

import { useCallback, useEffect, useState } from "react";
import {
  matchesTaskFilters,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";
import { useBoardEvents } from "@/hooks/use-board-events";
import { useBoardStore } from "@/store/board";
import { BoardColumn } from "./board-column";
import { BoardDndProvider } from "./board-dnd";
import { ServerFailure } from "./server-failure";
import { TopBar } from "./top-bar";

const columns: { status: TaskStatus; title: string }[] = [
  { status: "todo", title: "Todo" },
  { status: "in-progress", title: "In Progress" },
  { status: "done", title: "Done" },
  { status: "backlog", title: "Backlog" },
];

interface BoardProps {
  initialSearch: string;
  initialAssignee: string | null;
  initialPriority: TaskPriority | null;
}

type FilterParameter = "search" | "assignee" | "priority";

function replaceFilterParameter(name: FilterParameter, value: string | null) {
  const url = new URL(window.location.href);
  const normalizedValue = value?.trim();

  if (normalizedValue) {
    url.searchParams.set(name, normalizedValue);
  } else {
    url.searchParams.delete(name);
  }

  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function Board({
  initialSearch,
  initialAssignee,
  initialPriority,
}: BoardProps) {
  // Select each store value separately so Board rerenders only when one of
  // these specific values changes, rather than on every Zustand update.
  const fetchBoard = useBoardStore((state) => state.fetchBoard);
  const moveTask = useBoardStore((state) => state.moveTask);
  const beginTaskMutation = useBoardStore((state) => state.beginTaskMutation);
  const completeTaskMutation = useBoardStore(
    (state) => state.completeTaskMutation,
  );
  const failTaskMutation = useBoardStore((state) => state.failTaskMutation);
  const hasLoaded = useBoardStore((state) => state.hasLoaded);
  const error = useBoardStore((state) => state.error);
  const [dragError, setDragError] = useState<string | null>(null);

  // The filter state starts from the server-read URL query parameters.
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(
    initialAssignee,
  );
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | null>(
    initialPriority,
  );
  const [search, setSearch] = useState(initialSearch);
  const searchQuery = search.trim().toLowerCase();

  // Load the complete board once when this client component mounts.
  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Connect to live board events only after the initial board request succeeds.
  useBoardEvents(hasLoaded);

  const handleAssigneeChange = useCallback(
    (name: string | null) => {
      // Keep the visible filter and the shareable URL in sync.
      setSelectedAssignee(name);
      replaceFilterParameter("assignee", name);

      // Restore the complete board after removing an assignee filter.
      if (name === null) {
        void fetchBoard();
      }
    },
    [fetchBoard],
  );

  const handlePriorityChange = useCallback((priority: TaskPriority | null) => {
    setSelectedPriority(priority);
    replaceFilterParameter("priority", priority);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    replaceFilterParameter("search", value);
  }, []);

  // Drag-and-drop reports an index from the filtered list. Convert it to the
  // matching index in the full column so hidden tasks keep their positions.
  const getBoardIndex = useCallback(
    (status: TaskStatus, visibleIndex: number) => {
      if (!selectedAssignee && !selectedPriority && searchQuery.length === 0) {
        return visibleIndex;
      }

      const tasks = useBoardStore.getState()[status];
      const visibleTasks = tasks.filter(
        (task) =>
          matchesTaskFilters(
            task,
            selectedAssignee,
            selectedPriority,
            searchQuery,
          ),
      );

      if (visibleTasks.length === 0) return tasks.length;
      if (visibleIndex <= 0) return tasks.indexOf(visibleTasks[0]);
      if (visibleIndex >= visibleTasks.length) {
        return tasks.indexOf(visibleTasks[visibleTasks.length - 1]) + 1;
      }

      return tasks.indexOf(visibleTasks[visibleIndex]);
    },
    [searchQuery, selectedAssignee, selectedPriority],
  );

  const handleDrop = useCallback(
    async (taskId: string, status: TaskStatus, index: number) => {
      setDragError(null);

      // moveTask updates Zustand immediately and returns only the server
      // patches required to persist the reordered tasks.
      const patches = moveTask(taskId, status, getBoardIndex(status, index));
      if (patches.length === 0) return;

      // Mutation tracking prevents SSE echoes from racing the PATCH responses.
      patches.forEach(({ id }) => beginTaskMutation(id));

      try {
        await Promise.all(
          patches.map(async ({ id, changes }) => {
            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${id}`,
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(changes),
                },
              );

              if (!response.ok) {
                throw new Error(`Task update failed with ${response.status}`);
              }

              completeTaskMutation(await response.json());
            } catch (error) {
              failTaskMutation(id);
              throw error;
            }
          }),
        );
      } catch (dropError) {
        // If any PATCH fails, reload the authoritative board to roll back the
        // optimistic move and keep every affected position consistent.
        setDragError(
          dropError instanceof Error
            ? dropError.message
            : "Failed to move task",
        );
        await fetchBoard();
      }
    },
    [
      beginTaskMutation,
      completeTaskMutation,
      failTaskMutation,
      fetchBoard,
      getBoardIndex,
      moveTask,
    ],
  );

  return (
    <BoardDndProvider onDrop={handleDrop}>
      <main className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden rounded-md bg-board p-3 sm:gap-4 sm:p-4 lg:p-6">
        <TopBar
          selectedAssignee={selectedAssignee}
          onSelectedAssigneeChange={handleAssigneeChange}
          selectedPriority={selectedPriority}
          onSelectedPriorityChange={handlePriorityChange}
          search={search}
          onSearchChange={handleSearchChange}
        />
        {dragError && <p className="text-sm text-destructive">{dragError}</p>}
        <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 sm:gap-4">
          {columns.map((column) => (
            <BoardColumn
              key={column.status}
              {...column}
              selectedAssignee={selectedAssignee}
              selectedPriority={selectedPriority}
              searchQuery={searchQuery}
            />
          ))}
        </div>

        <ServerFailure open={Boolean(error)} onRetry={fetchBoard} />
      </main>
    </BoardDndProvider>
  );
}
