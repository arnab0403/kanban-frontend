import { Loader, MoreHorizontal, Plus } from "lucide-react";
import { ShimmerTask } from "./shimmer-task";
import { Task } from "./task";
import type { TaskRecord } from "@/lib/tasks";
import type { TaskStatus } from "@/lib/tasks";
import { TaskDropZone } from "./task-drop-zone";

interface SectionProps {
  status: TaskStatus;
  title: string;
  completed: number;
  total: number;
  tasks: TaskRecord[];
  loading?: boolean;
}

export function Section({
  status,
  title,
  completed,
  total,
  tasks,
  loading,
}: SectionProps) {
  return (
    <section className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-xl bg-secondary px-2 py-4">
      <header className="flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader className="size-4 shrink-0 text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          <span className="text-sm text-muted-foreground">
            {completed} / {total}
          </span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <button type="button" className="rounded-md p-1 hover:bg-secondary">
            <MoreHorizontal className="size-4" />
          </button>
          <button type="button" className="rounded-md p-1 hover:bg-secondary">
            <Plus className="size-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]">
        {loading
          ? Array.from({ length: 3 }, (_, index) => <ShimmerTask key={index} />)
          : tasks.length === 0
            ? <TaskDropZone id={`${status}-empty`} status={status} index={0} empty />
            : <>
                <TaskDropZone id={`${status}-start`} status={status} index={0} />
                {tasks.map((task, index) => (
                  <div key={task.id} className="flex flex-col">
                    <Task task={task} index={index} />
                    <TaskDropZone id={`${status}-${task.id}-after`} status={status} index={index + 1} />
                  </div>
                ))}
              </>}
      </div>
    </section>
  );
}
