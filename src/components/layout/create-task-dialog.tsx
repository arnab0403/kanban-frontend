"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import type { TaskPriority, TaskRecord, TaskStatus } from "@/lib/tasks";
import { useBoardStore } from "@/store/board";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const priorities: TaskPriority[] = ["low", "medium", "high"];

interface CreateTaskDialogProps {
  status: TaskStatus;
  position: number;
}

function emptyForm() {
  return {
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    assignee: "",
  };
}

export function CreateTaskDialog({ status, position }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateTask = useBoardStore((state) => state.updateTask);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    // Every new opening starts with a clean form and clears the last failure.
    if (nextOpen) {
      setForm(emptyForm());
      setError(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status, position }),
      });

      if (!response.ok) {
        throw new Error(`Task creation failed with ${response.status}`);
      }

      const task = (await response.json()) as TaskRecord;

      // The server response contains the authoritative id, version, and date.
      updateTask(task);
      setOpen(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to create task"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Add task to ${status}`}
        >
          <Plus />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Add a new task to the {status} column.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor={`create-title-${status}`}>Title</Label>
            <Input
              id={`create-title-${status}`}
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              required
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`create-description-${status}`}>Description</Label>
            <textarea
              id={`create-description-${status}`}
              className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`create-priority-${status}`}>Priority</Label>
              <select
                id={`create-priority-${status}`}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value as TaskPriority,
                  }))
                }
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`create-assignee-${status}`}>Assignee</Label>
              <Input
                id={`create-assignee-${status}`}
                value={form.assignee}
                onChange={(event) =>
                  setForm((current) => ({ ...current, assignee: event.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`create-status-${status}`}>Status</Label>
            <Input id={`create-status-${status}`} value={status} readOnly />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
