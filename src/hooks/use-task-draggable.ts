"use client";

import { useEffect, useRef } from "react";
import { Draggable } from "@dnd-kit/dom";
import type { TaskStatus } from "@/lib/tasks";
import {
  useBoardDnd,
  type TaskDragData,
} from "@/components/layout/board-dnd";

export function useTaskDraggable(
  taskId: string,
  status: TaskStatus,
  index: number
) {
  const elementRef = useRef<HTMLDivElement>(null);
  const { manager } = useBoardDnd();

  useEffect(() => {
    if (!manager || !elementRef.current) return;

    const draggable = new Draggable<TaskDragData>(
      {
        id: `task-${taskId}`,
        element: elementRef.current,
        data: { kind: "task", taskId, status, index },
      },
      manager
    );

    return () => draggable.destroy();
  }, [index, manager, status, taskId]);

  return elementRef;
}
