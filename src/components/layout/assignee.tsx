import { Plus, UserPlus, X } from "lucide-react";

interface AssigneeProps {
  name: string;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Assignee({ name }: AssigneeProps) {
  return (
    <div className="flex w-full items-center gap-1 rounded-lg border border-border bg-task p-2">
      <div className="flex items-center divide-x divide-border rounded-lg border border-border bg-[#141414] text-sm">
        <span className="flex items-center gap-2 px-3 py-1 text-foreground">
          <UserPlus className="size-4 text-muted-foreground" />
          <p className="text-[11px]">Assignee</p>
        </span>
        <span className="px-3 py-1.5 text-muted-foreground">is</span>
        <span className="flex items-center gap-2 px-3 py-1 text-foreground">
          <span className="flex size-4 items-center justify-center rounded-full bg-yellow-600 text-[7px] font-semibold text-white">
            {initials(name)}
          </span>
          <p className="text-[11px]">{name}</p>
        </span>
        <button
          type="button"
          className="px-3 py-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
