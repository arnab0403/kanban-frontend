export type TaskStatus = "todo" | "in-progress" | "done" | "unfinished";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  assignee: string;
  status: TaskStatus;
  position: number;
  updatedAt: string;
}

export const tasks: TaskRecord[] = [
  {
    id: "1",
    title: "Set up project repo",
    description: "Initialize the repository and base folder structure",
    priority: "high",
    assignee: "Ayush",
    status: "done",
    position: 1,
    updatedAt: "2026-09-10T09:00:00.000Z",
  },
  {
    id: "2",
    title: "Design task model",
    description: "Define the Task type and API contract",
    priority: "medium",
    assignee: "Ayush",
    status: "in-progress",
    position: 1,
    updatedAt: "2026-09-12T11:30:00.000Z",
  },
  {
    id: "3",
    title: "Build board UI",
    description: "Create the drag-and-drop Kanban board on the frontend",
    priority: "medium",
    assignee: "Riya",
    status: "todo",
    position: 1,
    updatedAt: "2026-09-13T15:45:00.000Z",
  },
  {
    id: "4",
    title: "Write API docs",
    description: "Document the task endpoints for the frontend team",
    priority: "low",
    assignee: "Riya",
    status: "todo",
    position: 2,
    updatedAt: "2026-09-14T08:20:00.000Z",
  },
];
