import { BarChart3, Circle, Loader } from "lucide-react";

interface Tag {
  label: string;
  color: string;
}

interface TaskProps {
  id: string;
  title: string;
  tags: Tag[];
  progress?: { completed: number; total: number };
  createdAt: string;
}

export function Task({ id, title, tags, progress, createdAt }: TaskProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-task p-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{id}</span>
        <div className="flex items-center gap-2">
          <Loader className="size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{title}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-background text-muted-foreground">
          <BarChart3 className="size-3.5" />
        </span>
        {tags.map((tag) => (
          <span
            key={tag.label}
            className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs text-foreground"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
            {tag.label}
          </span>
        ))}
        {progress && (
          <span className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs text-foreground">
            <Circle className="size-3 shrink-0 text-indigo-400" />
            {progress.completed}/{progress.total}
          </span>
        )}
      </div>

      <span className="text-xs text-muted-foreground">Created {createdAt}</span>
    </div>
  );
}
