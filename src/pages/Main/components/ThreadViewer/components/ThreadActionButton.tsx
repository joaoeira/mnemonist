import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Array as Arr, Effect, pipe } from "effect";
import { Ellipsis, Trash } from "lucide-react";
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

type ThreadActionButtonProps = {
  sessionId: Session["id"];
  threadId: Thread["id"];
};

export default function ThreadActionButton({
  sessionId,
  threadId,
}: ThreadActionButtonProps) {
  const queryClient = useQueryClient();

  const { mutate: deleteThread } = useMutation({
    mutationFn: () =>
      Effect.runPromise(deleteThreadEffect(threadId, sessionId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads", sessionId] });
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
