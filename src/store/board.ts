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

interface TaskLocation {
  task: TaskRecord;
  status: TaskStatus;
  index: number;
}

export interface TaskMovePatch {
  id: string;
  changes: Partial<Pick<TaskRecord, "status" | "position">>;
}

type QueuedRemoteEvent =
  | { type: "upsert"; task: TaskRecord }
  | { type: "delete"; id: string };

// Mutation tracking stays outside Zustand's reactive state because it is only
// used to coordinate HTTP responses with SSE events and should not rerender UI.
const pendingMutationCounts = new Map<string, number>();
const queuedRemoteEvents = new Map<string, QueuedRemoteEvent>();

interface BoardState extends Buckets {
  loading: boolean;
  error: string | null;
  hasLoaded: boolean;

  fetchBoard: () => Promise<void>;
  updateTask: (task: TaskRecord) => void;
  removeTask: (taskId: string) => void;

  beginTaskMutation: (taskId: string) => void;
  completeTaskMutation: (task: TaskRecord) => void;
  completeTaskDeletion: (taskId: string) => void;
  failTaskMutation: (taskId: string) => void;
  receiveRemoteTask: (task: TaskRecord) => void;
  receiveRemoteDeletion: (taskId: string) => void;
  moveTask: (taskId: string, status: TaskStatus, index: number) => TaskMovePatch[];
}

function emptyBuckets(): Buckets {
  return { todo: [], "in-progress": [], done: [], backlog: [] };
}

function isSupportedStatus(status: TaskStatus) {
  return STATUSES.includes(status);
}

function findTaskLocation(state: Buckets, taskId: string): TaskLocation | undefined {
  for (const status of STATUSES) {
    const index = state[status].findIndex((task) => task.id === taskId);
    if (index !== -1) {
      return { task: state[status][index], status, index };
    }
  }
}

function positionTasks(tasks: TaskRecord[], status: TaskStatus) {
  return tasks.map((task, index) => {
    const position = index + 1;
    if (task.status === status && task.position === position) return task;

    return { ...task, status, position };
  });
}

function beginMutation(taskId: string) {
  pendingMutationCounts.set(taskId, (pendingMutationCounts.get(taskId) ?? 0) + 1);
}

function releaseMutation(taskId: string) {
  const remaining = (pendingMutationCounts.get(taskId) ?? 1) - 1;
  if (remaining > 0) {
    pendingMutationCounts.set(taskId, remaining);
    return;
  }

  pendingMutationCounts.delete(taskId);
  const queuedEvent = queuedRemoteEvents.get(taskId);
  queuedRemoteEvents.delete(taskId);
  return queuedEvent;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  ...emptyBuckets(),
  loading: false,
  error: null,
  hasLoaded: false,
  updateTask: (task) => {
    if (!isSupportedStatus(task.status)) return;

    set((state) => {
      // A lower version is stale, while an equal version is an SSE/API echo
      // that has already been applied.
      const location = findTaskLocation(state, task.id);
      if (location && location.task.version >= task.version) return state;

      // A newly created task only changes its destination bucket.
      if (!location) {
        const targetTasks = [...state[task.status], task].sort(
          (a, b) => a.position - b.position,
        );
        return { [task.status]: targetTasks } as Partial<BoardState>;
      }

      // An edit that keeps the same status replaces only that column's array.
      if (location.status === task.status) {
        const nextTasks = [...state[location.status]];
        nextTasks[location.index] = task;
        nextTasks.sort((a, b) => a.position - b.position);
        return { [location.status]: nextTasks } as Partial<BoardState>;
      }

      // A status change replaces only the source and destination arrays.
      const sourceTasks = state[location.status].filter(
        (currentTask) => currentTask.id !== task.id,
      );
      const targetTasks = [...state[task.status], task].sort(
        (a, b) => a.position - b.position,
      );

      return {
        [location.status]: sourceTasks,
        [task.status]: targetTasks,
      } as Partial<BoardState>;
    });
  },
  removeTask: (taskId) => {
    set((state) => {
      const location = findTaskLocation(state, taskId);
      if (!location) return state;

      return {
        [location.status]: state[location.status].filter(
          (task) => task.id !== taskId,
        ),
      } as Partial<BoardState>;
    });
  },
  beginTaskMutation: (taskId) => {
    beginMutation(taskId);
  },
  completeTaskMutation: (task) => {
    get().updateTask(task);
    const queuedEvent = releaseMutation(task.id);
    if (!queuedEvent) return;

    if (queuedEvent.type === "delete") {
      get().removeTask(queuedEvent.id);
    } else {
      get().updateTask(queuedEvent.task);
    }
  },
  completeTaskDeletion: (taskId) => {
    // A successful DELETE is authoritative. Discard queued updates because
    // they were emitted before the server confirmed that the task is gone.
    get().removeTask(taskId);
    pendingMutationCounts.delete(taskId);
    queuedRemoteEvents.delete(taskId);
  },
  failTaskMutation: (taskId) => {
    const queuedEvent = releaseMutation(taskId);
    if (!queuedEvent) return;

    if (queuedEvent.type === "delete") {
      get().removeTask(queuedEvent.id);
    } else {
      get().updateTask(queuedEvent.task);
    }
  },
  receiveRemoteTask: (task) => {
    if (!isSupportedStatus(task.status)) return;


    // check if any pending mutation exists for this task. If so, queue the event for later processing.
    if (pendingMutationCounts.has(task.id)) {
      const queuedEvent = queuedRemoteEvents.get(task.id);
      if (
        queuedEvent?.type !== "upsert" ||
        queuedEvent.task.version < task.version
      ) {
        queuedRemoteEvents.set(task.id, { type: "upsert", task });
      }
      return;
    }

    get().updateTask(task);
  },
  receiveRemoteDeletion: (taskId) => {
    if (pendingMutationCounts.has(taskId)) {
      queuedRemoteEvents.set(taskId, { type: "delete", id: taskId });
      return;
    }

    get().removeTask(taskId);
  },
  moveTask: (taskId, targetStatus, targetIndex) => {
    const state = get();
    const location = findTaskLocation(state, taskId);
    if (!location) return [];

    const { task: sourceTask, status: sourceStatus, index: sourceIndex } = location;
    const sameStatus = sourceStatus === targetStatus;
    let nextSource: TaskRecord[];
    let nextTarget: TaskRecord[] | undefined;

    if (sameStatus) {
      const reorderedTasks = [...state[sourceStatus]];
      reorderedTasks.splice(sourceIndex, 1);

      // Removing an item shifts later indexes left. Compensate when moving down
      // within the same column so the task lands in the intended drop slot.
      const adjustedIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      const insertAt = Math.max(0, Math.min(adjustedIndex, reorderedTasks.length));
      reorderedTasks.splice(insertAt, 0, sourceTask);
      nextSource = positionTasks(reorderedTasks, sourceStatus);
    } else {
      const sourceTasks = state[sourceStatus].filter((task) => task.id !== taskId);
      const targetTasks = [...state[targetStatus]];
      const insertAt = Math.max(0, Math.min(targetIndex, targetTasks.length));
      targetTasks.splice(insertAt, 0, { ...sourceTask, status: targetStatus });

      nextSource = positionTasks(sourceTasks, sourceStatus);
      nextTarget = positionTasks(targetTasks, targetStatus);
    }

    // Compare the old and new board states and return only changed fields.
    // The caller uses these patches with PATCH /api/tasks/:id.
    const previousById = new Map(
      (sameStatus
        ? state[sourceStatus]
        : [...state[sourceStatus], ...state[targetStatus]]
      ).map((task) => [task.id, task]),
    );
    const patches: TaskMovePatch[] = [];
    const nextTasks = sameStatus ? nextSource : [...nextSource, ...nextTarget!];

    for (const task of nextTasks) {
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
    if (patches.length > 0) {
      if (sameStatus) {
        set({ [sourceStatus]: nextSource } as Partial<BoardState>);
      } else {
        set({
          [sourceStatus]: nextSource,
          [targetStatus]: nextTarget!,
        } as Partial<BoardState>);
      }
    }
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

      set({ ...buckets, loading: false, hasLoaded: true });
    } catch (error) {
      set({
        ...emptyBuckets(),
        loading: false,
        hasLoaded: false,
        error: error instanceof Error ? error.message : "Failed to load board",
      });
    }
  },
}));
