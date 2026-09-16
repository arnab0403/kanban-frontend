# Real-time collaboration plan

## Goal

Keep the Kanban board synchronized when another connected user creates,
updates, moves, or deletes a task without reloading the entire board.

Real-time changes must not overwrite a local optimistic change while its API
request is still in flight. Once local work has completed, the newest reliable
server state should win.

## Backend event contract

The backend exposes a Server-Sent Events stream:

```text
GET http://localhost:5000/api/events
```

The browser should connect using the configured backend URL:

```text
${NEXT_PUBLIC_API_URL}/api/events
```

Supported events:

| Event | Payload |
| --- | --- |
| `task:created` | Complete created task |
| `task:updated` | Complete updated task |
| `task:deleted` | `{ "id": "task-id" }` |

The created and updated payloads are expected to match `TaskRecord`, including
`id`, `title`, `description`, `priority`, `assignee`, `status`, `position`, and
the server-generated `updatedAt` value.

## Proposed client flow

1. Fetch the initial board through `GET /api/board`.
2. After that request settles successfully, connect an `EventSource` to
   `/api/events`.
3. Apply `task:created` by inserting the complete task into its status bucket.
4. Apply `task:updated` by removing any older copy of the task, inserting the
   complete server copy into its current status bucket, and sorting by position.
5. Apply `task:deleted` by removing the task ID from every status bucket.
6. Close the `EventSource` when the board unmounts.

These event operations should be idempotent. Receiving the same create, update,
or delete event more than once must not duplicate a task or cause an error.

## Local optimistic changes

The client should maintain a small in-memory collection of task IDs whose
create, update, move, or delete requests are still in flight.

When an event arrives for a task that has no pending local mutation, apply it
immediately.

When an event arrives for a task with a pending local mutation:

1. Do not immediately overwrite the optimistic task.
2. Keep the newest received server event for that task in a temporary queue.
3. Wait for the local API request to finish.
4. Compare the API response and queued event using their server-generated
   `updatedAt` values.
5. Apply the newest complete server task.

Delete events need special handling because their payload has no `updatedAt`.
A queued delete should be applied after the local mutation completes unless a
later reliable server response proves that the task still exists.

Drag-and-drop can update several task positions. Every affected task should be
marked as pending until its own PATCH request has completed.

## Events produced by the same browser

The backend broadcasts an event to every connection, including the browser that
started the mutation. Therefore, a client may receive its own POST, PATCH, or
DELETE as an SSE event before the HTTP response arrives.

This is expected. Task ID plus `updatedAt`, together with idempotent store
actions, should prevent duplicates and stale overwrites.

## Connection and recovery behavior

`EventSource` reconnects automatically after a connection failure. The current
backend has no event history or replay, so events can be missed while the client
is disconnected.

For reliable recovery, the client should refetch `GET /api/board` after an SSE
reconnection. A normal incoming event should update only the affected task;
the full refetch is reserved for reconnect recovery or an unrecoverable event
payload error.

The UI may expose a small connection state such as `connecting`, `connected`,
or `disconnected`, but receiving events should not block normal board usage.

## Error handling

- Ignore malformed event payloads and report them during development.
- Reject created or updated tasks with an unsupported status.
- Keep the existing board visible when the SSE connection is temporarily lost.
- Allow the browser's `EventSource` retry behavior to reconnect automatically.
- Refetch the board after reconnection because the server does not replay missed
  events.

## What is available now

The supplied API is sufficient for a basic real-time implementation because it
provides named SSE events and complete task payloads for creates and updates.
The server-managed `updatedAt` value can be used to choose between two complete
task versions.

## Recommended backend improvements

These are not mandatory for the first implementation, but they would make
concurrency and reconnection more reliable:

1. Add a monotonically increasing task `version` or revision number. This is
   safer than timestamps when updates happen within the same millisecond.
2. Accept a client mutation ID on POST/PATCH/DELETE and include it in emitted
   events. This lets a browser identify its own echoed mutation exactly.
3. Add SSE event IDs and support `Last-Event-ID` replay so reconnecting clients
   can recover missed events without fetching the complete board.
4. Send heartbeat comments periodically to prevent idle proxies from closing
   the SSE connection.
5. If authentication will be required, define how the SSE connection is
   authenticated. Native `EventSource` cannot attach arbitrary authorization
   headers.

## Details to confirm before implementation

- CORS permits the frontend origin to open `GET /api/events`.
- `task:created` and `task:updated` always contain a complete `TaskRecord`.
- Every created or updated task contains a valid server-generated `updatedAt`.
- The event stream uses `Content-Type: text/event-stream` and is not buffered by
  a reverse proxy.
- Whether the application needs to display an SSE connection-status indicator.

