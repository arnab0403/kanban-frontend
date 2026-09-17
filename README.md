# Collaborative Kanban Frontend

A responsive, realtime Kanban board built with Next.js, React, TypeScript,
Zustand, dnd-kit, Tailwind CSS, and shadcn/Radix UI components.

The board supports task creation, editing, deletion with undo, filtering,
optimistic updates, drag-and-drop, keyboard interaction, and Server-Sent Event
(SSE) synchronization.

## Features

- Four task columns: Todo, In Progress, Done, and Backlog.
- Mouse, touch, and keyboard drag-and-drop.
- Optimistic task editing and reordering.
- Rollback with an error toast when an update fails.
- Five-second deletion undo using a Sonner toast.
- Realtime create, update, and delete events through SSE.
- Search by task title.
- Assignee and priority filters.
- Filters stored in URL query parameters and restored after refresh.
- Responsive mobile layout with horizontally swipeable columns.
- Loading skeletons, empty-column states, and a server-failure dialog.
- Per-column Zustand subscriptions to reduce unnecessary rerenders.

## Requirements

- Node.js `>=20.9.0`
- npm
- A compatible Kanban backend API

## Getting Started

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:YOUR_BACKEND_PORT
```

Do not include a trailing `/api` in this value. The application adds endpoint
paths such as `/api/board` itself.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The backend must be running separately and must allow requests and SSE
connections from the frontend origin.

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create and type-check a production build. |
| `npm run start` | Run the previously generated production build. |
| `npm run lint` | Run ESLint across the project. |
| `npx tsc --noEmit` | Run TypeScript validation without generating files. |

## Folder Structure

```text
kanban-frontend/
├── public/                        # Static public assets
├── src/
│   ├── app/
│   │   ├── globals.css           # Theme tokens and global styles
│   │   ├── layout.tsx            # Root layout and global toaster
│   │   └── page.tsx              # URL filters and page composition
│   ├── components/
│   │   ├── layout/               # Application-specific components
│   │   └── ui/                   # shadcn/Radix UI primitives
│   ├── hooks/
│   │   ├── use-board-events.ts   # SSE subscription and event parsing
│   │   └── use-task-draggable.ts # DnD registration and keyboard props
│   ├── lib/
│   │   ├── tasks.ts              # Task types and filter predicate
│   │   └── utils.ts              # URL parsing and shared utilities
│   └── store/
│       └── board.ts              # Zustand state and mutation coordination
├── components.json               # shadcn configuration and aliases
├── next.config.ts                # Next.js configuration
├── package.json                  # Scripts and dependencies
└── tsconfig.json                 # TypeScript and `@/` alias configuration
```

## Component Organization

Application components live in `src/components/layout`. They are divided by
responsibility instead of placing all board behavior in one large component.

| Component | Responsibility |
| --- | --- |
| `board.tsx` | Coordinates filters, loading, DnD persistence, SSE startup, and server failures. |
| `board-column.tsx` | Subscribes to one status bucket and filters that column's tasks. |
| `section.tsx` | Renders a column header, loading state, tasks, drop slots, and creation control. |
| `task.tsx` | Displays and edits a task, performs optimistic updates, deletes, and provides undo. |
| `board-dnd.tsx` | Owns the dnd-kit manager and translates drag events into `onDrop` calls. |
| `task-drop-zone.tsx` | Registers insertion positions before and after task cards. |
| `create-task-dialog.tsx` | Creates a task in a specific status column. |
| `top-bar.tsx` | Composes search, assignee, and priority controls. |
| `search.tsx` | Controlled title-search input. |
| `assignee.tsx` | Lazily fetches users and controls the assignee filter. |
| `priority.tsx` | Controls the priority filter. |
| `server-failure.tsx` | Blocks an invalid board after the initial request fails and offers retry. |
| `shimmer-task.tsx` | Task-shaped loading placeholder. |
| `sidebar.tsx` | Desktop-only visual navigation placeholder. Its actions are not implemented. |

The `src/components/ui` directory contains reusable UI primitives such as
buttons, dialogs, inputs, popovers, skeletons, and the Sonner toaster. These
components do not contain Kanban business logic.

## Application Data Flow

```text
page.tsx reads URL filters
          ↓
Board loads GET /api/board
          ↓
Zustand groups tasks by status
          ↓
Each BoardColumn subscribes to one status array
          ↓
Section renders tasks and drop positions
```

`BoardColumn` is memoized and subscribes only to `state[status]`. The Zustand
store preserves references for unchanged status arrays. As a result, changing a
Todo task does not force unrelated Done or Backlog columns to rerender. Moving a
task between columns changes only the source and destination arrays.

## Zustand Store

`src/store/board.ts` is the central client-side board store. It contains:

- One task array for each status.
- Loading, error, and initial-load state.
- Board fetching and task update/remove actions.
- Optimistic edit and rollback actions.
- Drag-and-drop reorder calculations.
- Minimal PATCH generation for changed status and position fields.
- Mutation tracking for coordination between REST responses and SSE events.

Mutation tracking is intentionally kept outside reactive Zustand state. It does
not render UI; it temporarily queues realtime events for tasks with an active
HTTP mutation. This prevents an SSE echo and an API response from applying in an
unsafe network order.

## Filtering and URL State

The following query parameters are supported:

| Parameter | Example | Purpose |
| --- | --- | --- |
| `search` | `?search=login` | Match task titles case-insensitively. |
| `assignee` | `?assignee=Alex` | Show tasks assigned to one user. |
| `priority` | `?priority=high` | Show tasks with one priority. |

Filters use AND logic. For example:

```text
/?search=api&assignee=Alex&priority=high
```

Changing a filter updates the URL with `history.replaceState`, so it does not
add an entry to browser history. `page.tsx` reads the parameters again after a
refresh and passes them to `Board` as initial values.

Drag indexes from a filtered column are converted back to indexes in the full
unfiltered status array. This prevents hidden tasks from receiving incorrect
positions.

## Drag-and-Drop and Keyboard Controls

One `DragDropManager` is created by `BoardDndProvider` and shared through React
Context. Task cards register as draggable elements, while gaps around cards
register as drop targets.

| Key | Action |
| --- | --- |
| `Tab` | Focus a task card. |
| `Space` or `Enter` | Pick up or drop the focused task. |
| Arrow keys | Move the active task toward another drop position. |
| `Escape` | Cancel the current drag. |

dnd-kit supplies the keyboard sensor and screen-reader live announcements. The
task hook adds explicit focus, labels, and keyboard shortcut metadata.

## Optimistic Updates

Task editing and drag-and-drop update Zustand before the server responds:

1. Save the previous task or board state.
2. Apply the requested change locally.
3. Send the request in the background.
4. Accept the authoritative task returned by the backend.
5. If the request fails, restore or refetch server state and show an error.

This keeps interactions responsive without allowing failed changes to remain in
the interface.

## Delete and Undo

A deletion request is sent to the backend immediately. After it succeeds, the
deleted task is kept in an in-memory map for five seconds while a toast displays
an Undo button. Undo sends `POST /api/tasks` with the deleted task's editable
data and adds the newly created server record back to Zustand.

The undo cache is memory-only and is cleared by a page refresh.

## Realtime Events

After the initial board request succeeds, `useBoardEvents` connects to:

```text
GET /api/events
```

| Event | Payload |
| --- | --- |
| `task:created` | Complete task object |
| `task:updated` | Complete task object |
| `task:deleted` | `{ "id": "task-id" }` |

Task versions are compared before applying an update. Older versions and
duplicate API/SSE echoes are ignored. `EventSource` automatically attempts to
reconnect after a temporary connection loss.

## Backend API Contract

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/board` | Fetch all tasks, grouped or as a flat collection. |
| `GET` | `/api/user` | Fetch assignee names as a `string[]`. |
| `POST` | `/api/tasks` | Create or restore a task. |
| `PATCH` | `/api/tasks/:id` | Update task fields, status, or position. |
| `DELETE` | `/api/tasks/:id` | Delete a task. |
| `GET` | `/api/events` | Open the SSE stream. |

The frontend expects this task shape:

```ts
interface TaskRecord {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  assignee: string;
  status: "todo" | "in-progress" | "done" | "backlog";
  position: number;
  version: number;
  updatedAt: string;
}
```

## Installed Packages

### Runtime Dependencies

| Package | Version | Usage |
| --- | --- | --- |
| `next` | `16.3.5` | App Router framework, rendering, and production builds. |
| `react`, `react-dom` | `19.2.8` | Component rendering and client state. |
| `zustand` | `^5.0.15` | Global board state with selector subscriptions. |
| `@dnd-kit/dom` | `^0.5.0` | Pointer, touch, and keyboard drag-and-drop. |
| `radix-ui` | `^1.6.7` | Accessible dialog and popover primitives. |
| `shadcn` | `^4.21.0` | UI component registry and configuration. |
| `sonner` | `^2.0.8` | Success, error, and undo notifications. |
| `lucide-react` | `^1.46.0` | Application icons. |
| `class-variance-authority` | `^0.7.1` | Variant-based class composition. |
| `cn` | `^0.3.0` | Conditional class-name composition. |
| `next-themes` | `^0.4.6` | Theme integration used by the toaster. |
| `tw-animate-css` | `^1.4.0` | Tailwind-compatible UI animations. |

### Development Dependencies

| Package | Version | Usage |
| --- | --- | --- |
| `typescript` | `^5` | Static type checking. |
| `tailwindcss` | `^4` | Utility-first styling and responsive layout. |
| `@tailwindcss/postcss` | `^4` | Tailwind PostCSS integration. |
| `eslint` | `^9` | Source linting. |
| `eslint-config-next` | `16.3.5` | Next.js and React lint rules. |
| `@types/node` | `^20` | Node.js TypeScript definitions. |
| `@types/react`, `@types/react-dom` | `^19` | React TypeScript definitions. |

## Styling and Responsiveness

- Tailwind CSS utilities provide component styling.
- Global color and radius tokens live in `src/app/globals.css`.
- shadcn uses the `radix-nova` style and neutral base palette.
- The desktop sidebar is hidden below the `md` breakpoint.
- Filters wrap on narrow screens and search becomes full width.
- Columns remain horizontally scrollable and use scroll snapping on mobile.
- Dialogs have a viewport-based maximum height and become scrollable.

## Path Alias

TypeScript maps `@/*` to `src/*`:

```ts
import { useBoardStore } from "@/store/board";
```

## Current Limitations

- Sidebar links and workspace controls are visual placeholders.
- The standalone plus button in the top bar is not connected to an action.
- Deleted-task undo state does not survive a page refresh.
- There is currently no automated test script in `package.json`.
