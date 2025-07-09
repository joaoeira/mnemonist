import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface FlashcardContextMenuProps {
  children: ReactNode;
  onDelete: () => void;
  onCreatePermutations: () => void;
}

export function FlashcardContextMenu({
  children,
  onDelete,
  onCreatePermutations,
}: FlashcardContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onCreatePermutations}>
          Create Permutations
        </ContextMenuItem>
        <ContextMenuItem onClick={onDelete} variant="destructive">
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
