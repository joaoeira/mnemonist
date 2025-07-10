import { useQuery } from "@tanstack/react-query";
import { Effect } from "effect";
import { Document } from "@/domain/document/schema";
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

export default function ThreadManager({
  sessionId,
  documentId,
}: {
  sessionId: SessionType["id"];
  documentId: Document["id"];
}) {
  const { data: threads, isLoading } = useQuery({
    queryKey: ["threads", sessionId],
    queryFn: () => getThreads(sessionId),
  });

  if (isLoading) return <div>Loading...</div>;

  if (!threads) return <div>Session not found</div>;

  if (threads.length === 0) return <div>No threads</div>;

  const firstThread = threads[0];

  return <ThreadViewer thread={firstThread} documentId={documentId} />;
}
