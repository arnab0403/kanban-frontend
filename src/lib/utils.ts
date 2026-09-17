import type { TaskPriority } from "@/lib/tasks";

export { cn } from "cn";

// Next.js supplies page search parameters asynchronously and allows duplicate
// query keys, which are represented as string arrays.
export type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

// Filters use only the first value when a URL contains a duplicate query key.
export function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// Validate URL input before treating it as a domain-level priority.
export function parsePriority(value: string | undefined): TaskPriority | null {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : null;
}
