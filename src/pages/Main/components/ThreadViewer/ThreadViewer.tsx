import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Effect } from "effect";
import { Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Document } from "@/domain/document/schema";
import { Session } from "@/domain/session/schema";
import { FlashcardService } from "../../../../domain/flashcard/service";
import type { Message } from "../../../../domain/message/schema";
import { MessageService } from "../../../../domain/message/service";
import type { Thread } from "../../../../domain/thread/schema";
import { ThreadService } from "../../../../domain/thread/service";
import Flashcard from "../Flashcard/Flashcard";
import { AssistantMessageViewer } from "./components/AssistantMessageViewer";
import { ChatTextArea } from "./components/ChatTextArea";
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

  if (isLoading) return <div>Loading...</div>;

  if (!items) return <div>Thread not found</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="px-4 py-4">
            <div className="flex flex-col items-center space-y-4">
              {items.map((item) => {
                if (item._tag === "Message") {
                  if (item.content._tag === "UserMessage") {
                    return (
                      <UserMessageViewer
                        key={item.id}
                        message={item}
                        onDelete={() => deleteMessage(item.id)}
                      />
                    );
                  }

                  return (
                    <AssistantMessageViewer
                      key={item.id}
                      message={item}
                      onDelete={() => deleteMessage(item.id)}
                    />
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
