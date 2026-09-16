"use client";

import { useEffect, useRef, useState } from "react";
import { Droppable } from "@dnd-kit/dom";
import { cn } from "cn";
import type { TaskStatus } from "@/lib/tasks";
import { useBoardDnd } from "./board-dnd";

interface TaskDropData {
  kind: "task-slot";
  status: TaskStatus;
  index: number;
}

interface TaskDropZoneProps {
  id: string;
  status: TaskStatus;
  index: number;
  empty?: boolean;
}

export function TaskDropZone({ id, status, index, empty }: TaskDropZoneProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const { manager, dragging, activeSource } = useBoardDnd();
  const [active, setActive] = useState(false);
  const duplicateSourceSlot =
    dragging &&
    activeSource?.status === status &&
    index === activeSource.index + 1;

  useEffect(() => {
    if (!manager || !elementRef.current || duplicateSourceSlot) return;

    const droppable = new Droppable<TaskDropData>(
      {
        id: `task-slot-${id}`,
        element: elementRef.current,
        data: { kind: "task-slot", status, index },
      },
      manager
    );
    const removeOverListener = manager.monitor.addEventListener(
      "dragover",
      ({ operation }) => setActive(operation.target?.id === droppable.id)
    );
    const removeEndListener = manager.monitor.addEventListener("dragend", () => {
      setActive(false);
    });

    return () => {
      removeOverListener();
      removeEndListener();
      droppable.destroy();
    };
  }, [duplicateSourceSlot, id, index, manager, status]);

  return (
    <div
      ref={elementRef}
      aria-hidden="true"
      className={cn(
        "flex h-2 shrink-0 items-center justify-center rounded-lg border border-transparent text-xs text-muted-foreground transition-[height,background-color,border-color] duration-150",
        duplicateSourceSlot && "hidden",
        dragging && "h-4 border-dashed border-border bg-background/30",
        empty && "min-h-16 flex-1",
        active && "h-14 border-ring bg-muted/70 text-foreground"
      )}
    >
      {(active || (empty && dragging)) && "Drop task here"}
    </div>
  );
}
