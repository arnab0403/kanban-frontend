export type TaskStatus = "todo" | "in-progress" | "done" | "backlog";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  assignee: string;
  status: TaskStatus;
  position: number;
  version: number;
  updatedAt: string;
}
