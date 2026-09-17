"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { TaskPriority, TaskRecord, TaskStatus } from "@/lib/tasks";
import { useBoardEvents } from "@/hooks/use-board-events";
import { useBoardStore } from "@/store/board";
import { BoardDndProvider } from "./board-dnd";
import { Section } from "./section";
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

function matchesFilters(
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

const BoardColumn = memo(function BoardColumn({
  status,
  title,
  selectedAssignee,
  selectedPriority,
  searchQuery,
}: {
  status: TaskStatus;
  title: string;
  selectedAssignee: string | null;
  selectedPriority: TaskPriority | null;
  searchQuery: string;
}) {
  const tasks = useBoardStore((state) => state[status]);
  const loading = useBoardStore((state) => state.loading);
  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) =>
        matchesFilters(task, selectedAssignee, selectedPriority, searchQuery),
      ),
    [searchQuery, selectedAssignee, selectedPriority, tasks],
  );
  console.log("Board name is:", title); // Using this you can check the unncesary re-rendering of the BoardColumn component
  return (
    <div className="flex h-full min-h-0 w-96 shrink-0">
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

export function Board({
  initialSearch,
  initialAssignee,
  initialPriority,
}: BoardProps) {
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
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(
    initialAssignee,
  );
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | null>(
    initialPriority,
  );
  const [search, setSearch] = useState(initialSearch);
  const searchQuery = search.trim().toLowerCase();

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useBoardEvents(hasLoaded);

  const handleAssigneeChange = useCallback(
    (name: string | null) => {
      setSelectedAssignee(name);
      replaceFilterParameter("assignee", name);

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

  const getBoardIndex = useCallback(
    (status: TaskStatus, visibleIndex: number) => {
      if (!selectedAssignee && !selectedPriority && searchQuery.length === 0) {
        return visibleIndex;
      }

      const tasks = useBoardStore.getState()[status];
      const visibleTasks = tasks.filter(
        (task) =>
          matchesFilters(
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
      const patches = moveTask(taskId, status, getBoardIndex(status, index));
      if (patches.length === 0) return;

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
      <main className="flex h-full min-h-0 flex-col gap-4 overflow-hidden rounded-md bg-board p-6">
        <TopBar
          selectedAssignee={selectedAssignee}
          onSelectedAssigneeChange={handleAssigneeChange}
          selectedPriority={selectedPriority}
          onSelectedPriorityChange={handlePriorityChange}
          search={search}
          onSearchChange={handleSearchChange}
        />
        {(error || dragError) && (
          <p className="text-sm text-destructive">{error ?? dragError}</p>
        )}
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto overflow-y-hidden">
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
      </main>
    </BoardDndProvider>
  );
}
