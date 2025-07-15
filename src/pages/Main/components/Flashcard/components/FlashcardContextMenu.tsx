import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "@xstate/store/react";
import { Array as Arr, Effect, Option } from "effect";
import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Session } from "@/domain/session/schema";
import { SessionService } from "@/domain/session/service";
import type { Thread } from "@/domain/thread/schema";
import { ThreadService } from "@/domain/thread/service";
import type { Flashcard } from "../../../../../domain/flashcard/schema";
import { sessionIdAtom } from "../../../atoms/sessionIdAtom";

interface FlashcardContextMenuProps {
  children: ReactNode;
  onDelete: () => void;
  onCreatePermutations: () => void;
  flashcard: Flashcard;
  threadId: Thread["id"];
}

function sendFlashcardToNewThreadEffect(
  flashcard: Flashcard,
  threadId: Thread["id"],
  sessionId: Session["id"]
) {
  const program = Effect.gen(function* () {
    const threadService = yield* ThreadService;
    const sessionService = yield* SessionService;

    const thread = yield* threadService.create({
      items: [flashcard.id],
      visible: true,
    });

    const sessionThreads = yield* sessionService
      .getThreads(sessionId)
      .pipe(Effect.map((threads) => threads.map((t) => t.id)));

    const threadIndex = Arr.findFirstIndex(
      sessionThreads,
      (id) => id === threadId
    ).pipe(Option.getOrThrow);

    const newThreadIds = Arr.insertAt(
      sessionThreads,
      threadIndex + 1,
      thread.id
    ).pipe(Option.getOrThrow);

    yield* sessionService.update(sessionId, { threads: newThreadIds });

    return thread;
  });

  return program.pipe(
    Effect.provide(ThreadService.Default),
    Effect.provide(SessionService.Default)
  );
}

export function FlashcardContextMenu({
  children,
  onDelete,
  onCreatePermutations,
  flashcard,
  threadId,
}: FlashcardContextMenuProps) {
  const sessionId = useAtom(sessionIdAtom);
  const queryClient = useQueryClient();

  const { mutate: sendFlashcardToNewThread } = useMutation({
    mutationFn: () => {
      if (!sessionId) return Promise.reject(new Error("Session ID not found"));
      return Effect.runPromise(
        sendFlashcardToNewThreadEffect(flashcard, threadId, sessionId)
      );
    },
    onSuccess: (newThread) => {
      queryClient.invalidateQueries({ queryKey: ["threads", sessionId] });
      setTimeout(
        () =>
          document
            .querySelector(`[data-thread-id="${newThread.id}"]`)
            ?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            }),
        100
      );
    },
  });

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
        <ContextMenuItem onClick={() => sendFlashcardToNewThread()}>
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
