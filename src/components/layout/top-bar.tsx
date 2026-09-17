"use client";

import { Plus } from "lucide-react";
import type { TaskPriority } from "@/lib/tasks";
import { Assignee } from "./assignee";
import { Priority } from "./priority";
import { Search } from "./search";

interface TopBarProps {
  selectedAssignee: string | null;
  onSelectedAssigneeChange: (name: string | null) => void;
  selectedPriority: TaskPriority | null;
  onSelectedPriorityChange: (priority: TaskPriority | null) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

// Controlled filters live in Board so they can be combined and persisted in
// the URL; TopBar only composes their individual controls.
export function TopBar({
  selectedAssignee,
  onSelectedAssigneeChange,
  selectedPriority,
  onSelectedPriorityChange,
  search,
  onSearchChange,
}: TopBarProps) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-border bg-task p-2 sm:gap-3">
      <Assignee
        selectedUser={selectedAssignee}
        onSelectedUserChange={onSelectedAssigneeChange}
      />
      <Priority
        selectedPriority={selectedPriority}
        onSelectedPriorityChange={onSelectedPriorityChange}
      />
      <button
        type="button"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <Plus className="size-4" />
      </button>

      <Search value={search} onValueChange={onSearchChange} />
    </div>
  );
}
