"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DragDropManager } from "@dnd-kit/dom";
import type { TaskStatus } from "@/lib/tasks";

export interface TaskDragData {
  kind: "task";
  taskId: string;
  status: TaskStatus;
  index: number;
}

interface BoardDndContextValue {
  manager: DragDropManager | null;
  dragging: boolean;
  activeSource: TaskDragData | null;
}

const BoardDndContext = createContext<BoardDndContextValue>({
  manager: null,
  dragging: false,
  activeSource: null,
});

interface BoardDndProviderProps {
  children: ReactNode;
  onDrop: (taskId: string, status: TaskStatus, index: number) => void;
}

export function BoardDndProvider({ children, onDrop }: BoardDndProviderProps) {
  const [manager, setManager] = useState<DragDropManager | null>(null);
  const [dragging, setDragging] = useState(false);
  const [activeSource, setActiveSource] = useState<TaskDragData | null>(null);
  const onDropRef = useRef(onDrop);

  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);

  useEffect(() => {
    const nextManager = new DragDropManager();
    const removeStartListener = nextManager.monitor.addEventListener("dragstart", ({ operation }) => {
      setDragging(true);
      setActiveSource((operation.source?.data as TaskDragData | undefined) ?? null);
    });
    const removeEndListener = nextManager.monitor.addEventListener(
      "dragend",
      ({ canceled, operation }) => {
        setDragging(false);
        setActiveSource(null);
        if (canceled) return;

        const source = operation.source?.data as TaskDragData | undefined;
        const target = operation.target?.data as
          | { kind: "task-slot"; status: TaskStatus; index: number }
          | undefined;
        if (source?.kind !== "task" || target?.kind !== "task-slot") return;

        onDropRef.current(source.taskId, target.status, target.index);
      }
    );
    const frame = requestAnimationFrame(() => setManager(nextManager));

    return () => {
      cancelAnimationFrame(frame);
      removeStartListener();
      removeEndListener();
      nextManager.destroy();
    };
  }, []);

  return (
    <BoardDndContext.Provider value={{ manager, dragging, activeSource }}>
      {children}
    </BoardDndContext.Provider>
  );
}

export function useBoardDnd() {
  return useContext(BoardDndContext);
}
