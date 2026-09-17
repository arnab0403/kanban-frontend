"use client";

import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function Search({ value, onValueChange }: SearchProps) {
  return (
    <div className="relative ml-auto w-72 shrink-0">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="Search tasks by title..."
        aria-label="Search tasks by title"
        className="bg-board pl-8"
      />
    </div>
  );
}
