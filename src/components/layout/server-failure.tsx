"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ServerFailureProps {
  open: boolean;
  onRetry: () => void | Promise<void>;
}

/** Blocks the board after an initial fetch failure until a retry succeeds. */
export function ServerFailure({ open, onRetry }: ServerFailureProps) {
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      {/* A board without valid data can only be recovered through retry. */}
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Server is down</DialogTitle>
          <DialogDescription>
            Please come back after some time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={() => void onRetry()}>
            Try again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
