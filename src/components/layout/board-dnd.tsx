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

// Metadata attached to every draggable task and read again on drag end.
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

// These fallback values are returned only when a component reads the context
// outside BoardDndProvider; the provider replaces them with live drag state.
const BoardDndContext = createContext<BoardDndContextValue>({
  manager: null,
  dragging: false,
  activeSource: null,
});

interface BoardDndProviderProps {
  children: ReactNode;
  onDrop: (taskId: string, status: TaskStatus, index: number) => void;
}

/**
 * Owns the single dnd-kit manager shared by every task and drop zone.
 * The provider translates low-level drag events into the board's onDrop call.
 */
export function BoardDndProvider({ children, onDrop }: BoardDndProviderProps) {
  const [manager, setManager] = useState<DragDropManager | null>(null);
  const [dragging, setDragging] = useState(false);
  const [activeSource, setActiveSource] = useState<TaskDragData | null>(null);
  const onDropRef = useRef(onDrop);

  // Keep the latest callback available without recreating the manager whenever
  // Board produces a new callback reference.
  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);

  useEffect(() => {
    const nextManager = new DragDropManager();

    // Shared drag state lets all task slots react to the active operation.
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

        // Board owns the actual reorder and API persistence.
        onDropRef.current(source.taskId, target.status, target.index);
      }
    );

    // Publish the manager after child elements have completed their first render.
    const frame = requestAnimationFrame(() => setManager(nextManager));

    return () => {
      // Remove global listeners and dnd-kit resources when the provider unmounts.
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
  // Descendants use this hook instead of receiving DnD props through each layer.
  return useContext(BoardDndContext);
}
