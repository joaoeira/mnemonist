import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface MessageContextMenuProps {
  children: ReactNode;
  onDelete: () => void;
  onSendToNewThread: () => void;
}

export function MessageContextMenu({
  children,
  onDelete,
  onSendToNewThread,
}: MessageContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onSendToNewThread}>
          Send to New Thread
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} variant="destructive">
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
