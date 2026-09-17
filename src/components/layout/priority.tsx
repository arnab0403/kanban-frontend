"use client";

import { useState } from "react";
import { ListFilter, X } from "lucide-react";
import type { TaskPriority } from "@/lib/tasks";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const priorities: TaskPriority[] = ["low", "medium", "high"];

interface PriorityProps {
  selectedPriority: TaskPriority | null;
  onSelectedPriorityChange: (priority: TaskPriority | null) => void;
}

export function Priority({
  selectedPriority,
  onSelectedPriorityChange,
}: PriorityProps) {
  // Popover visibility is local; the selected filter is controlled by Board.
  const [open, setOpen] = useState(false);

  function selectPriority(priority: TaskPriority) {
    onSelectedPriorityChange(priority);
    setOpen(false);
  }

  return (
    <div className="flex h-8 max-w-full items-center divide-x divide-border overflow-hidden rounded-lg border border-border bg-[#141414] text-sm">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-full cursor-pointer items-center gap-2 px-3 text-foreground transition-colors hover:bg-secondary"
          >
            <ListFilter className="size-4 text-muted-foreground" />
            <span className="text-[11px]">Priority</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48" aria-label="Choose a priority">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Select priority
          </p>
          <div role="listbox">
            {priorities.map((priority) => (
              <button
                key={priority}
                type="button"
                role="option"
                aria-selected={selectedPriority === priority}
                className="flex w-full cursor-pointer items-center rounded-md px-2 py-2 text-left text-xs capitalize transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => selectPriority(priority)}
              >
                {priority}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {selectedPriority && (
        <>
          <span className="flex h-full items-center px-3 text-muted-foreground">
            is
          </span>
          <span className="flex h-full items-center px-3 text-[11px] capitalize text-foreground">
            {selectedPriority}
          </span>
          <button
            type="button"
            aria-label="Clear priority"
            className="h-full cursor-pointer px-3 text-muted-foreground hover:text-foreground"
            onClick={() => onSelectedPriorityChange(null)}
          >
            <X className="size-4" />
          </button>
        </>
      )}
    </div>
  );
}
