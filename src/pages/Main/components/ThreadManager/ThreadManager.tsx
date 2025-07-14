import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Array as Arr, Effect, Option } from "effect";
import { Plus } from "lucide-react";
import type { Document } from "@/domain/document/schema";
import type { Thread } from "@/domain/thread/schema";
import type { Session as SessionType } from "../../../../domain/session/schema";
import { SessionService } from "../../../../domain/session/service";
import { ThreadService } from "../../../../domain/thread/service";
import ThreadViewer from "../ThreadViewer/ThreadViewer";

async function getThreads(sessionId: SessionType["id"]) {
  const program = Effect.gen(function* () {
    const sessionService = yield* SessionService;
    const threads = yield* sessionService.getThreads(sessionId);
    return threads;
  });

  return Effect.runPromise(
    program.pipe(
      Effect.provide(SessionService.Default),
      Effect.provide(ThreadService.Default)
    )
  );
}

async function addThread(sessionId: SessionType["id"]) {
  const program = Effect.gen(function* () {
    const sessionService = yield* SessionService;
    const threadService = yield* ThreadService;

    const thread = yield* threadService.create({
      items: [],
      visible: true,
    });

    yield* sessionService.addThreadId(sessionId, thread.id);

    return thread;
  });

  return Effect.runPromise(
    program.pipe(
      Effect.provide(SessionService.Default),
      Effect.provide(ThreadService.Default)
    )
  );
}

async function addThreadAfter(
  sessionId: SessionType["id"],
  threadId: Thread["id"]
) {
  const program = Effect.gen(function* () {
    const sessionService = yield* SessionService;
    const threadService = yield* ThreadService;

    const thread = yield* threadService.create({
      items: [],
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

  return Effect.runPromise(
    program.pipe(
      Effect.provide(SessionService.Default),
      Effect.provide(ThreadService.Default)
    )
  );
}

function ThreadViewerContainer({
  thread,
  documentId,
  isLastThread,
  sessionId,
}: {
  thread: Thread;
  documentId: Document["id"];
  isLastThread: boolean;
  sessionId: SessionType["id"];
}) {
  const queryClient = useQueryClient();
  const { mutate: addThreadAfterMutation } = useMutation({
    mutationFn: () => addThreadAfter(sessionId, thread.id),
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
    <div
      className="flex-1 min-w-xl h-full border-r border-border last:border-r-0 relative"
      data-thread-id={thread.id}
    >
      <ThreadViewer
        thread={thread}
        documentId={documentId}
        sessionId={sessionId}
      />
      {!isLastThread && (
        <div
          className={`absolute opacity-0 hover:opacity-100 top-0 right-0 h-full w-8 z-10 flex items-center justify-center transition-opacity duration-200`}
          style={{ transform: "translateX(50%)" }}
        >
          <button
            type="button"
            onClick={() => addThreadAfterMutation()}
            className="w-8 h-8 bg-muted border border-border hover:border-primary rounded-full flex items-center justify-center transition-all duration-200 hover:shadow-md"
            aria-label="Add thread after this one"
          >
            <Plus className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors duration-200" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ThreadManager({
  sessionId,
  documentId,
}: {
  sessionId: SessionType["id"];
  documentId: Document["id"];
}) {
  const queryClient = useQueryClient();
  const { data: threads, isLoading } = useQuery({
    queryKey: ["threads", sessionId],
    queryFn: () => getThreads(sessionId),
  });

  const { mutate: addThreadMutation } = useMutation({
    mutationFn: () => addThread(sessionId),
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

  if (isLoading) return <div>Loading...</div>;

  if (!threads) return <div>Session not found</div>;

  if (threads.length === 0) return <div>No threads</div>;

  return (
    <div className="flex h-full overflow-x-auto">
      {threads.map((thread, index) => (
        <ThreadViewerContainer
          key={thread.id}
          thread={thread}
          sessionId={sessionId}
          documentId={documentId}
          isLastThread={index === threads.length - 1}
        />
      ))}
      <div className="relative flex flex-col items-center justify-center min-w-24 h-full group">
        <button
          type="button"
          onClick={() => addThreadMutation()}
          className="relative my-4 w-10 h-10 bg-muted hover:bg-primary/10 border border-border hover:border-primary rounded-full flex items-center justify-center group transition-all duration-200 hover:shadow-md"
          aria-label="Add thread"
        >
          <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
        </button>
      </div>
    </div>
  );
}
