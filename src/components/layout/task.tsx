"use client";

import { useState, type FormEvent } from "react";
import { Loader, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { TaskPriority, TaskRecord, TaskStatus } from "@/lib/tasks";
import { useBoardStore } from "@/store/board";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTaskDraggable } from "@/hooks/use-task-draggable";

const priorities: TaskPriority[] = ["low", "medium", "high"];
const statuses: TaskStatus[] = ["todo", "in-progress", "done", "backlog"];
const editableFields = [
  "title",
  "description",
  "priority",
  "assignee",
  "status",
  "position",
] as const;

const UNDO_DELETE_WINDOW_MS = 5_000;

interface DeletedTaskEntry {
  task: TaskRecord;
  timeout: ReturnType<typeof setTimeout>;
}

const deletedTasks = new Map<string, DeletedTaskEntry>();

function rememberDeletedTask(task: TaskRecord) {
  const existingEntry = deletedTasks.get(task.id);
  if (existingEntry) clearTimeout(existingEntry.timeout);

  const timeout = setTimeout(() => {
    deletedTasks.delete(task.id);
  }, UNDO_DELETE_WINDOW_MS);

  deletedTasks.set(task.id, { task, timeout });
}

async function restoreDeletedTask(taskId: string) {
  const entry = deletedTasks.get(taskId);
  if (!entry) {
    toast.error("The undo period has expired");
    return;
  }

  clearTimeout(entry.timeout);
  deletedTasks.delete(taskId);

  const { title, description, priority, assignee, status, position } = entry.task;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        priority,
        assignee,
        status,
        position,
      }),
    });

    if (!response.ok) {
      throw new Error(`Task restoration failed with ${response.status}`);
    }

    useBoardStore.getState().updateTask((await response.json()) as TaskRecord);
    toast.success("Task restored");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to restore task");
  }
}

function showDeletedTaskToast(task: TaskRecord) {
  rememberDeletedTask(task);
  toast.success("Task deleted", {
    description: task.title,
    duration: UNDO_DELETE_WINDOW_MS,
    action: {
      label: "Undo",
      onClick: () => void restoreDeletedTask(task.id),
    },
  });
}

export function Task({ task, index }: { task: TaskRecord; index: number }) {
  const draggableRef = useTaskDraggable(task.id, task.status, index);
  const displayTitle =
    task.title.length > 25 ? `${task.title.slice(0, 25)}...` : task.title;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(task);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const beginTaskMutation = useBoardStore((state) => state.beginTaskMutation);
  const completeTaskMutation = useBoardStore((state) => state.completeTaskMutation);
  const completeTaskDeletion = useBoardStore((state) => state.completeTaskDeletion);
  const failTaskMutation = useBoardStore((state) => state.failTaskMutation);
  const hasUnsavedChanges = editableFields.some(
    (field) => draft[field] !== task[field],
  );

  function openEditor() {
    setDraft(task);
    setSaveError(null);
    setOpen(true);
  }

  function updateField<Key extends keyof TaskRecord>(key: Key, value: TaskRecord[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      openEditor();
      return;
    }

    if (saving) return;

    if (
      hasUnsavedChanges &&
      !window.confirm("Discard your unsaved task changes?")
    ) {
      return;
    }

    setOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);

    const changes = Object.fromEntries(
      editableFields
        .filter((field) => draft[field] !== task[field])
        .map((field) => [field, draft[field]])
    );

    if (Object.keys(changes).length === 0) {
      setOpen(false);
      setSaving(false);
      return;
    }

    beginTaskMutation(task.id);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        throw new Error(`Task update failed with ${response.status}`);
      }

      completeTaskMutation((await response.json()) as TaskRecord);
      setOpen(false);
    } catch (error) {
      failTaskMutation(task.id);
      setSaveError(error instanceof Error ? error.message : "Failed to update task");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    beginTaskMutation(task.id);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Task deletion failed with ${response.status}`);
      }

      completeTaskDeletion(task.id);
      showDeletedTaskToast(task);
    } catch (error) {
      failTaskMutation(task.id);
      setDeleteError(error instanceof Error ? error.message : "Failed to delete task");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div ref={draggableRef} className="touch-none cursor-grab active:cursor-grabbing">
        <div data-task-card className="group/task flex flex-col gap-3 rounded-xl bg-task p-4 transition-[transform,box-shadow] duration-150">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">DEMO-{task.id}</span>
            <div className="flex items-center gap-2">
              <Loader className="size-4 shrink-0 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground" title={task.title}>
                {displayTitle}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer ml-auto opacity-0 transition-opacity group-hover/task:opacity-100 group-focus-within/task:opacity-100"
            aria-label={`Edit ${task.title}`}
            onClick={openEditor}
          >
            <Pencil className="text-neutral-400" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            className="cursor-pointer opacity-0 transition-opacity group-hover/task:opacity-100 group-focus-within/task:opacity-100"
            aria-label={`Delete ${task.title}`}
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-background px-2.5 py-1 text-xs text-foreground">{task.priority}</span>
          <span className="rounded-full bg-background px-2.5 py-1 text-xs text-foreground">{task.assignee}</span>
          <span className="rounded-full bg-background px-2.5 py-1 text-xs text-foreground">{task.status}</span>
        </div>

        <span className="text-xs text-muted-foreground">
          Updated {new Date(task.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
            <DialogDescription>Update the details for {task.id}.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor={`task-id-${task.id}`}>ID</Label>
              <Input id={`task-id-${task.id}`} value={draft.id} readOnly />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`task-title-${task.id}`}>Title</Label>
              <Input id={`task-title-${task.id}`} value={draft.title} onChange={(event) => updateField("title", event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`task-description-${task.id}`}>Description</Label>
              <textarea id={`task-description-${task.id}`} className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" value={draft.description} onChange={(event) => updateField("description", event.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`task-priority-${task.id}`}>Priority</Label>
                <select id={`task-priority-${task.id}`} className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm" value={draft.priority} onChange={(event) => updateField("priority", event.target.value as TaskPriority)}>
                  {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`task-assignee-${task.id}`}>Assignee</Label>
                <Input id={`task-assignee-${task.id}`} value={draft.assignee} onChange={(event) => updateField("assignee", event.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`task-status-${task.id}`}>Status</Label>
                <select id={`task-status-${task.id}`} className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm" value={draft.status} onChange={(event) => updateField("status", event.target.value as TaskStatus)}>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`task-position-${task.id}`}>Position</Label>
                <Input id={`task-position-${task.id}`} type="number" value={draft.position} onChange={(event) => updateField("position", Number(event.target.value))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`task-updated-${task.id}`}>Updated at</Label>
              <Input id={`task-updated-${task.id}`} value={draft.updatedAt} readOnly />
            </div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
