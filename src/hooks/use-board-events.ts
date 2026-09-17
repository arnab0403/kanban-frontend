"use client";

import { useEffect } from "react";
import type { TaskRecord } from "@/lib/tasks";
import { useBoardStore } from "@/store/board";

interface DeletedTaskPayload {
  id: string;
}

/**
 * Subscribes to the backend SSE stream after the initial board has loaded.
 * Complete task events are version-checked by the store before being applied.
 */
export function useBoardEvents(enabled: boolean) {
  const receiveRemoteTask = useBoardStore((state) => state.receiveRemoteTask);
  const receiveRemoteDeletion = useBoardStore(
    (state) => state.receiveRemoteDeletion
  );

  useEffect(() => {
    if (!enabled) return;

    // EventSource automatically reconnects if the network connection drops.
    const events = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/api/events`
    );

    function handleTaskCreated(event: MessageEvent<string>) {
      try {
        const task = JSON.parse(event.data) as TaskRecord;
        console.info("[SSE] task:created", task);
        receiveRemoteTask(task);
      } catch (error) {
        console.error("[SSE] Invalid task:created payload", error);
      }
    }

    function handleTaskUpdated(event: MessageEvent<string>) {
      try {
        const task = JSON.parse(event.data) as TaskRecord;
        console.info("[SSE] task:updated", task);
        receiveRemoteTask(task);
      } catch (error) {
        console.error("[SSE] Invalid task:updated payload", error);
      }
    }

    function handleTaskDeleted(event: MessageEvent<string>) {
      try {
        const payload = JSON.parse(event.data) as DeletedTaskPayload;
        console.info("[SSE] task:deleted", payload);
        receiveRemoteDeletion(payload.id);
      } catch (error) {
        console.error("[SSE] Invalid task:deleted payload", error);
      }
    }

    events.addEventListener("task:created", handleTaskCreated);
    events.addEventListener("task:updated", handleTaskUpdated);
    events.addEventListener("task:deleted", handleTaskDeleted);

    events.onerror = () => {
      console.warn("[SSE] Event connection lost; EventSource will retry");
    };

    return () => {
      // Close the stream when the board unmounts or live updates are disabled.
      events.close();
    };
  }, [enabled, receiveRemoteDeletion, receiveRemoteTask]);
}
