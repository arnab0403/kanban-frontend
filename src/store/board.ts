/**
 * Central Zustand store for the Kanban board.
 *
 * It loads tasks from the API, groups them by status, applies task updates,
 * and performs optimistic drag-and-drop reordering while producing the
 * minimal status and position changes that must be persisted.
 */
import { create } from "zustand";
import type { TaskRecord, TaskStatus } from "@/lib/tasks";

const STATUSES: TaskStatus[] = ["todo", "in-progress", "done", "backlog"];

type Buckets = Record<TaskStatus, TaskRecord[]>;

export interface TaskMovePatch {
  id: string;
  changes: Partial<Pick<TaskRecord, "status" | "position">>;
}

interface BoardState extends Buckets {
  loading: boolean;
  error: string | null;
  fetchBoard: () => Promise<void>;
  updateTask: (task: TaskRecord) => void;
  moveTask: (taskId: string, status: TaskStatus, index: number) => TaskMovePatch[];
}

function emptyBuckets(): Buckets {
  return { todo: [], "in-progress": [], done: [], backlog: [] };
}

export const useBoardStore = create<BoardState>((set, get) => ({
  ...emptyBuckets(),
  loading: false,
  error: null,
  updateTask: (task) => {
    set((state) => {
      // Remove the old copy from every bucket because the task's status may
      // have changed, then insert the latest server copy into its new bucket.
      const next = emptyBuckets();
      for (const status of STATUSES) {
        next[status] = state[status].filter((currentTask) => currentTask.id !== task.id);
      }
      next[task.status].push(task);

      // Keep each column in the same order as the server-side position values.
      for (const status of STATUSES) {
        next[status].sort((a, b) => a.position - b.position);
      }
      return next;
    });
  },
  moveTask: (taskId, targetStatus, targetIndex) => {
    const state = get();

    // Snapshot the current buckets and locate the task before calculating the
    // new order. The snapshot is also used to determine which API PATCH calls
    // are required after the optimistic move.
    const previous = emptyBuckets();
    let sourceTask: TaskRecord | undefined;
    let sourceStatus: TaskStatus | undefined;
    let sourceIndex = -1;

    for (const status of STATUSES) {
      previous[status] = [...state[status]];
      const index = state[status].findIndex((task) => task.id === taskId);
      if (index !== -1) {
        sourceTask = state[status][index];
        sourceStatus = status;
        sourceIndex = index;
      }
    }

    if (!sourceTask || !sourceStatus) return [];

    // First remove the dragged task from its original bucket. It is inserted
    // into the target bucket below, which also handles cross-column moves.
    const next = emptyBuckets();
    for (const status of STATUSES) {
      next[status] = previous[status].filter((task) => task.id !== taskId);
    }

    // Removing an item shifts later indexes left. Compensate when moving down
    // within the same column so the task lands in the intended drop slot.
    const adjustedIndex =
      sourceStatus === targetStatus && sourceIndex < targetIndex
        ? targetIndex - 1
        : targetIndex;
    const insertAt = Math.max(0, Math.min(adjustedIndex, next[targetStatus].length));
    next[targetStatus].splice(insertAt, 0, { ...sourceTask, status: targetStatus });

    // Positions are one-based in the API. Renumber every affected column so
    // tasks keep a stable order after the board is fetched again.
    for (const status of STATUSES) {
      next[status] = next[status].map((task, index) => ({
        ...task,
        status,
        position: index + 1,
      }));
    }

    // Compare the old and new board states and return only changed fields.
    // The caller uses these patches with PATCH /api/tasks/:id.
    const previousById = new Map(
      STATUSES.flatMap((status) => previous[status]).map((task) => [task.id, task])
    );
    const patches: TaskMovePatch[] = [];

    for (const task of STATUSES.flatMap((status) => next[status])) {
      const oldTask = previousById.get(task.id);
      if (!oldTask) continue;

      const changes: TaskMovePatch["changes"] = {};
      if (oldTask.status !== task.status) changes.status = task.status;
      if (oldTask.position !== task.position) changes.position = task.position;
      if (Object.keys(changes).length > 0) {
        patches.push({ id: task.id, changes });
      }
    }

    // Apply the move immediately for responsive drag-and-drop feedback. The
    // board component reloads server state if any PATCH request fails.
    if (patches.length > 0) set(next);
    return patches;
  },
  fetchBoard: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/board`);
      if (!response.ok) {
        throw new Error(`Board request failed with ${response.status}`);
      }

      const data: Record<string, TaskRecord[]> = await response.json();
      const buckets = emptyBuckets();

      // Accept either a grouped board object or a flat task array, then group
      // valid tasks into the status buckets expected by the UI.
      for (const task of Object.values(data).flat()) {
        if (STATUSES.includes(task.status)) {
          buckets[task.status].push(task);
        }
      }

      for (const status of STATUSES) {
        buckets[status].sort((a, b) => a.position - b.position);
      }

      set({ ...buckets, loading: false });
    } catch (error) {
      set({
        ...emptyBuckets(),
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load board",
      });
    }
  },
}));
