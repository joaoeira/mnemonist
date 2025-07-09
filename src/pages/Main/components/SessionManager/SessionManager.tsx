import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Array as Arr, Effect, Order } from "effect";
import { useMemo, useState } from "react";
import type { Document as DocumentType } from "../../../../domain/document/schema";
import { DocumentService } from "../../../../domain/document/service";
import type { Session as SessionType } from "../../../../domain/session/schema";
import { SessionService } from "../../../../domain/session/service";
import { ThreadService } from "../../../../domain/thread/service";
import ThreadManager from "../ThreadManager/ThreadManager";

async function getSessions(documentId: DocumentType["id"]) {
  const program = Effect.gen(function* () {
    const documentService = yield* DocumentService;

    const document = yield* documentService.findById(documentId);

    const sessions = yield* documentService.getSessions(document.id);

    return sessions;
  });

  return Effect.runPromise(
    program.pipe(
      Effect.provide(SessionService.Default),
      Effect.provide(DocumentService.Default)
    )
  );
}

function createSessionEffect(documentId: DocumentType["id"]) {
  const program = Effect.gen(function* () {
    const sessionService = yield* SessionService;

    const session = yield* sessionService.create(documentId, {
      threads: [],
    });

    return session;
  });

  return program;
}

export default function SessionManager({
  documentId,
}: {
  documentId: DocumentType["id"];
}) {
  const [currentSessionId, setCurrentSessionId] = useState<
    SessionType["id"] | null
  >(null);
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions", documentId],
    queryFn: () => getSessions(documentId),
  });

  const sortedSessions = useMemo(() => {
    return Arr.sort(
      sessions ?? [],
      Order.mapInput(Order.Date, (session: SessionType) => session.updatedAt)
    );
  }, [sessions]);

  const { mutate: createSession, isPending: isCreating } = useMutation({
    mutationFn: () =>
      Effect.runPromise(
        createSessionEffect(documentId).pipe(
          Effect.provide(SessionService.Default),
          Effect.provide(DocumentService.Default),
          Effect.provide(ThreadService.Default)
        )
      ),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["sessions", documentId] });
      setCurrentSessionId(session.id);
    },
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof createSessionEffect>>
    ) => {
      console.error(error);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading sessions...</div>
      </div>
    );
  }

  if (currentSessionId) {
    return <ThreadManager sessionId={currentSessionId} />;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Sessions</h2>
        <button
          type="button"
          onClick={() => createSession()}
          disabled={isCreating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="Add new session"
              >
                <title>Add new session</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Session
            </>
          )}
        </button>
      </div>

      {!sortedSessions || sortedSessions.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-gray-500 mb-2">No study sessions yet</div>
          <div className="text-sm text-gray-400">
            Create your first session to get started
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSessions.map((session, index) => (
            <div
              key={session.id}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200 cursor-pointer"
              onPointerDown={() => setCurrentSessionId(session.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">
                        Session #{index + 1}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {session.threads.length} threads
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    <div>
                      Created:{" "}
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      Last updated:{" "}
                      {new Date(session.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
