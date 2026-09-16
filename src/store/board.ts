import { create } from "zustand";
import type { TaskRecord, TaskStatus } from "@/lib/tasks";

const STATUSES: TaskStatus[] = ["todo", "in-progress", "done", "backlog"];

type Buckets = Record<TaskStatus, TaskRecord[]>;

interface BoardState extends Buckets {
  loading: boolean;
  error: string | null;
  fetchBoard: () => Promise<void>;
}

function emptyBuckets(): Buckets {
  return { todo: [], "in-progress": [], done: [], backlog: [] };
}

export const useBoardStore = create<BoardState>((set) => ({
  ...emptyBuckets(),
  loading: false,
  error: null,
  fetchBoard: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/board`);
      if (!response.ok) {
        throw new Error(`Board request failed with ${response.status}`);
      }

      const data: Record<string, TaskRecord[]> = await response.json();
      const buckets = emptyBuckets();
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
