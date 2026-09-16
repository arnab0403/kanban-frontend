import { Loader, MoreHorizontal, Plus } from "lucide-react";
import { ShimmerTask } from "./shimmer-task";
import { Task } from "./task";

interface Tag {
  label: string;
  color: string;
}

interface SectionTask {
  id: string;
  title: string;
  tags: Tag[];
  progress?: { completed: number; total: number };
  createdAt: string;
}

interface SectionProps {
  title: string;
  completed: number;
  total: number;
  tasks: SectionTask[];
  loading?: boolean;
}

export function Section({
  title,
  completed,
  total,
  tasks,
  loading,
}: SectionProps) {
  return (
    <section className="flex h-full flex-col gap-4 rounded-xl bg-secondary px-2 py-4">
      <header className="flex items-center justify-between">
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

      <div className="flex flex-col gap-3">
        {loading
          ? Array.from({ length: 3 }, (_, index) => <ShimmerTask key={index} />)
          : tasks.map((task) => <Task key={task.id} {...task} />)}
      </div>
    </section>
  );
}
