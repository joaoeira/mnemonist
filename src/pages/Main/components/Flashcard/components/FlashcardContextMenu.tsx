import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Flashcard } from "../../../../../domain/flashcard/schema";

interface FlashcardContextMenuProps {
  children: ReactNode;
  onDelete: () => void;
  onCreatePermutations: () => void;
  flashcard: Flashcard;
}

export function FlashcardContextMenu({
  children,
  onDelete,
  onCreatePermutations,
  flashcard,
}: FlashcardContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={onCreatePermutations}
          disabled={!flashcard.question.trim() || !flashcard.answer.trim()}
        >
          Create Permutations
        </ContextMenuItem>
        <ContextMenuItem onClick={onDelete} variant="destructive">
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
