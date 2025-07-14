import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Array as Arr, Effect, Option } from "effect";
import { Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Document } from "@/domain/document/schema";
import type { Session } from "@/domain/session/schema";
import { SessionService } from "@/domain/session/service";
import { FlashcardService } from "../../../../domain/flashcard/service";
import type { Message } from "../../../../domain/message/schema";
import { MessageService } from "../../../../domain/message/service";
import type { Thread } from "../../../../domain/thread/schema";
import { ThreadService } from "../../../../domain/thread/service";
import Flashcard from "../Flashcard/Flashcard";
import { AssistantMessageViewer } from "./components/AssistantMessageViewer";
import { ChatTextArea } from "./components/ChatTextArea";
import { MessageContextMenu } from "./components/MessageContextMenu";
import ThreadActionButton from "./components/ThreadActionButton";
import { UserMessageViewer } from "./components/UserMessageViewer";

function getThreadItems(thread: Thread) {
  const program = Effect.gen(function* () {
    const threadService = yield* ThreadService;
    const items = yield* threadService.getItems(thread.id);
    return items;
  });

  return Effect.runPromise(
    program.pipe(
      Effect.provide(ThreadService.Default),
      Effect.provide(MessageService.Default),
      Effect.provide(FlashcardService.Default)
    )
  );
}

function addFlashcardEffect(threadId: Thread["id"]) {
  const program = Effect.gen(function* () {
    const threadService = yield* ThreadService;
    const flashcardService = yield* FlashcardService;

    yield* threadService.findById(threadId);

    const flashcard = yield* flashcardService.create({
      question: "",
      answer: "",
      context: undefined,
      noteId: undefined,
    });

    yield* threadService.addItem(threadId, flashcard.id);

    return flashcard;
  });

  return program;
}

function deleteMessageEffect(id: Message["id"], threadId: Thread["id"]) {
  const program = Effect.gen(function* () {
    const messageService = yield* MessageService;
    const threadService = yield* ThreadService;

    yield* threadService.removeItem(threadId, id);

    yield* messageService.delete(id);
  });

  return program;
}

function sendMessageToNewThreadEffect(
  message: Message,
  threadId: Thread["id"],
  sessionId: Session["id"]
) {
  const program = Effect.gen(function* () {
    const threadService = yield* ThreadService;
    const sessionService = yield* SessionService;

    const thread = yield* threadService.create({
      items: [message.id],
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

export default function ThreadViewer({
  thread,
  documentId,
  sessionId,
}: {
  thread: Thread;
  documentId: Document["id"];
  sessionId: Session["id"];
}) {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["threadItems", thread.id],
    queryFn: () => getThreadItems(thread),
  });

  const { mutate: addFlashcard } = useMutation({
    mutationFn: () =>
      Effect.runPromise(
        addFlashcardEffect(thread.id).pipe(
          Effect.provide(ThreadService.Default),
          Effect.provide(FlashcardService.Default)
        )
      ),
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof addFlashcardEffect>>
    ) => {
      console.error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threadItems", thread.id] });
    },
  });

  const { mutate: deleteMessage } = useMutation({
    mutationFn: (messageId: Message["id"]) =>
      Effect.runPromise(
        deleteMessageEffect(messageId, thread.id).pipe(
          Effect.provide(MessageService.Default),
          Effect.provide(ThreadService.Default)
        )
      ),
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof deleteMessageEffect>>
    ) => {
      console.error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["threadItems", thread.id],
      });
    },
  });

  const { mutate: sendMessageToNewThread } = useMutation({
    mutationFn: (message: Message) =>
      Effect.runPromise(
        sendMessageToNewThreadEffect(message, thread.id, sessionId)
      ),
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

  if (!items) return <div>Thread not found</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="h-6 shadow w-full bg-chart-4 border-b border-border">
        <div className="flex items-center justify-end">
          <ThreadActionButton sessionId={sessionId} threadId={thread.id} />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="px-4 py-4">
            <div className="flex flex-col items-center space-y-4">
              {items.map((item) => {
                if (item._tag === "Message") {
                  if (item.content._tag === "UserMessage") {
                    return (
                      <MessageContextMenu
                        onDelete={() => deleteMessage(item.id)}
                        onSendToNewThread={() => sendMessageToNewThread(item)}
                        key={item.id}
                      >
                        <UserMessageViewer key={item.id} message={item} />
                      </MessageContextMenu>
                    );
                  }

                  return (
                    <MessageContextMenu
                      key={item.id}
                      onDelete={() => deleteMessage(item.id)}
                      onSendToNewThread={() => sendMessageToNewThread(item)}
                    >
                      <AssistantMessageViewer key={item.id} message={item} />
                    </MessageContextMenu>
                  );
                }

                return (
                  <Flashcard
                    key={item.id}
                    flashcard={item}
                    threadId={thread.id}
                    documentId={documentId}
                    sessionId={sessionId}
                  />
                );
              })}

              <div className="relative flex items-center justify-center w-full py-8 group">
                <div className="flex-1 h-px bg-border group-hover:bg-muted-foreground transition-colors duration-200" />
                <button
                  type="button"
                  onClick={() => addFlashcard()}
                  className="relative mx-4 w-10 h-10 bg-muted hover:bg-primary/10 border border-border hover:border-primary rounded-full flex items-center justify-center group transition-all duration-200 hover:shadow-md"
                  aria-label="Add flashcard"
                >
                  <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                </button>

                <div className="flex-1 h-px bg-border group-hover:bg-muted-foreground transition-colors duration-200" />
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
      <div className="flex-shrink-0 border-t bg-accent-foreground">
        <ChatTextArea threadId={thread.id} />
      </div>
    </div>
  );
}
