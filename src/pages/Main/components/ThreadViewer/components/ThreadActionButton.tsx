import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Array as Arr, Effect, Option, pipe } from "effect";
import { ArrowLeft, ArrowRight, Ellipsis, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Session } from "@/domain/session/schema";
import { SessionService } from "@/domain/session/service";
import type { Thread } from "@/domain/thread/schema";
import { ThreadService } from "@/domain/thread/service";

async function getThreadPosition(
  sessionId: Session["id"],
  threadId: Thread["id"]
): Promise<"first" | "last" | "middle"> {
  const program = Effect.gen(function* () {
    const sessionService = yield* SessionService;
    const threads = yield* sessionService.getThreads(sessionId);

    const threadIndex = Arr.findFirstIndex(
      threads,
      (thread) => thread.id === threadId
    ).pipe(Option.getOrThrow);

    const position =
      threadIndex === 0
        ? "first"
        : threadIndex === threads.length - 1
        ? "last"
        : "middle";

    return position;
  });

  return Effect.runPromise(
    program.pipe(
      Effect.provide(SessionService.Default),
      Effect.provide(ThreadService.Default)
    )
  );
}

function deleteThreadEffect(threadId: Thread["id"], sessionId: Session["id"]) {
  const program = Effect.gen(function* () {
    const sessionService = yield* SessionService;
    const threadService = yield* ThreadService;

    const threads = yield* sessionService.getThreads(sessionId);
    const newThreads = pipe(
      Arr.filter(threads, (thread) => thread.id !== threadId),
      Arr.map((thread) => thread.id)
    );
    yield* sessionService.update(sessionId, {
      threads: newThreads,
    });

    yield* threadService.delete(threadId);
  });

  return program.pipe(
    Effect.provide(SessionService.Default),
    Effect.provide(ThreadService.Default)
  );
}

function moveThreadEffect(
  threadId: Thread["id"],
  sessionId: Session["id"],
  direction: "left" | "right"
) {
  const program = Effect.gen(function* () {
    const sessionService = yield* SessionService;

    const threadIds = yield* sessionService
      .getThreads(sessionId)
      .pipe(Effect.map((threads) => threads.map((thread) => thread.id)));

    const threadIndex = Arr.findFirstIndex(
      threadIds,
      (id) => id === threadId
    ).pipe(Option.getOrThrow);

    const newThreadIds = pipe(
      Arr.remove(threadIds, threadIndex),
      Arr.insertAt(
        direction === "left" ? threadIndex - 1 : threadIndex + 1,
        threadId
      ),
      Option.getOrThrow
    );

    yield* sessionService.update(sessionId, {
      threads: newThreadIds,
    });
  });

  return program.pipe(
    Effect.provide(SessionService.Default),
    Effect.provide(ThreadService.Default)
  );
}

type ThreadActionButtonProps = {
  sessionId: Session["id"];
  threadId: Thread["id"];
};

export default function ThreadActionButton({
  sessionId,
  threadId,
}: ThreadActionButtonProps) {
  const queryClient = useQueryClient();

  const { data: threadPosition } = useQuery({
    queryKey: ["thread-position", sessionId, threadId],
    queryFn: () => getThreadPosition(sessionId, threadId),
  });

  const { mutate: deleteThread } = useMutation({
    mutationFn: () =>
      Effect.runPromise(deleteThreadEffect(threadId, sessionId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads", sessionId] });
    },
  });

  const { mutate: moveThread } = useMutation({
    mutationFn: (direction: "left" | "right") =>
      Effect.runPromise(moveThreadEffect(threadId, sessionId, direction)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads", sessionId] });
      queryClient.invalidateQueries({
        queryKey: ["thread-position"],
      });
      document.querySelector(`[data-thread-id="${threadId}"]`)?.scrollIntoView({
        behavior: "instant",
        block: "nearest",
      });
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-5 w-5 mr-2 mt-[1px]">
          <Ellipsis className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => moveThread("left")}
          disabled={threadPosition && threadPosition === "first"}
        >
          <ArrowLeft className="w-3 h-3" />
          Move Left
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => moveThread("right")}
          disabled={threadPosition && threadPosition === "last"}
        >
          <ArrowRight className="w-3 h-3" />
          Move Right
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => deleteThread()}
          className="text-destructive"
        >
          <Trash className="w-3 h-3" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
