"use client";

import { useEffect, useRef } from "react";
import { Draggable } from "@dnd-kit/dom";
import type { TaskStatus } from "@/lib/tasks";
import {
  useBoardDnd,
  type TaskDragData,
} from "@/components/layout/board-dnd";

/** Registers a task card with the board's shared drag-and-drop manager. */
export function useTaskDraggable(
  taskId: string,
  status: TaskStatus,
  index: number
) {
  const elementRef = useRef<HTMLDivElement>(null);
  const { manager } = useBoardDnd();

  useEffect(() => {
    if (!manager || !elementRef.current) return;

    // Status and index travel with the dragged element so the provider can
    // resolve its source and final destination when dragging ends.
    const draggable = new Draggable<TaskDragData>(
      {
        id: `task-${taskId}`,
        element: elementRef.current,
        data: { kind: "task", taskId, status, index },
      },
      manager
    );

    // Re-register when the task moves and destroy the old DOM binding.
    return () => draggable.destroy();
  }, [index, manager, status, taskId]);

  return elementRef;
}
