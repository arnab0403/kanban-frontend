"use client";

import { useState } from "react";
import { LoaderCircle, UserPlus, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AssigneeProps {
  selectedUser: string | null;
  onSelectedUserChange: (name: string | null) => void;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Assignee({
  selectedUser,
  onSelectedUserChange,
}: AssigneeProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user`);

      if (!response.ok) {
        throw new Error(`Failed to load users (${response.status})`);
      }

      setUsers((await response.json()) as string[]);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "Failed to load users"
      );
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen && users === null && error === null) {
      void loadUsers();
    }
  }

  function selectUser(name: string) {
    onSelectedUserChange(name);
    setOpen(false);
  }

  return (
    <div className="flex items-center divide-x divide-border overflow-hidden rounded-lg border border-border bg-[#141414] text-sm">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 px-3 py-1 text-foreground transition-colors hover:bg-secondary"
          >
            <UserPlus className="size-4 text-muted-foreground" />
            <span className="text-[11px]">Assignee</span>
          </button>
        </PopoverTrigger>
        <PopoverContent aria-label="Choose an assignee">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Select assignee
          </p>

          {users === null && !error && (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading users...
            </div>
          )}

          {error && (
            <div className="space-y-2 px-2 py-2">
              <p className="text-xs text-destructive">{error}</p>
              <button
                type="button"
                className="text-xs text-foreground underline underline-offset-4"
                onClick={() => void loadUsers()}
              >
                Try again
              </button>
            </div>
          )}

          {users?.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              No users found.
            </p>
          )}

          {users && users.length > 0 && (
            <div className="max-h-56 overflow-y-auto" role="listbox">
              {users.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={selectedUser === name}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => selectUser(name)}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-yellow-600 text-[9px] font-semibold text-white">
                    {initials(name)}
                  </span>
                  <span className="truncate">{name}</span>
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {selectedUser && (
        <>
          <span className="px-3 py-1.5 text-muted-foreground">is</span>
          <span className="flex items-center gap-2 px-3 py-1 text-foreground">
            <span className="flex size-4 items-center justify-center rounded-full bg-yellow-600 text-[7px] font-semibold text-white">
              {initials(selectedUser)}
            </span>
            <span className="text-[11px]">{selectedUser}</span>
          </span>
          <button
            type="button"
            aria-label="Clear assignee"
            className="cursor-pointer px-3 py-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => onSelectedUserChange(null)}
          >
            <X className="size-4" />
          </button>
        </>
      )}
    </div>
  );
}
