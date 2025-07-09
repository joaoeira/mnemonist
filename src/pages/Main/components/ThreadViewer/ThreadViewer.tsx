import { AssistantMessage, TextPart, UserMessage } from "@effect/ai/AiInput";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Effect } from "effect";
import { FlashcardService } from "../../../../domain/flashcard/service";
import { MessageService } from "../../../../domain/message/service";
import type { Thread } from "../../../../domain/thread/schema";
import { ThreadService } from "../../../../domain/thread/service";
import Flashcard from "../Flashcard/Flashcard";

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

function addAssistantMessageEffect(threadId: Thread["id"]) {
  const program = Effect.gen(function* () {
    const threadService = yield* ThreadService;
    const messageService = yield* MessageService;

    yield* threadService.findById(threadId);

    const newAssistantMessage: typeof AssistantMessage.Type =
      AssistantMessage.make({
        parts: [TextPart.make({ text: "" })],
      });

    const message = yield* messageService.create({
      content: newAssistantMessage,
    });

    yield* threadService.addItem(threadId, message.id);

    return message;
  });

  return program;
}

function addUserMessageEffect(threadId: Thread["id"]) {
  const program = Effect.gen(function* () {
    const threadService = yield* ThreadService;
    const messageService = yield* MessageService;

    yield* threadService.findById(threadId);

    const newUserMessage: typeof UserMessage.Type = UserMessage.make({
      parts: [TextPart.make({ text: "" })],
    });

    const message = yield* messageService.create({
      content: newUserMessage,
    });

    yield* threadService.addItem(threadId, message.id);

    return message;
  });

  return program;
}

export default function ThreadViewer({ thread }: { thread: Thread }) {
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

  const { mutate: addAssistantMessage } = useMutation({
    mutationFn: () =>
      Effect.runPromise(
        addAssistantMessageEffect(thread.id).pipe(
          Effect.provide(ThreadService.Default),
          Effect.provide(MessageService.Default)
        )
      ),
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof addAssistantMessageEffect>>
    ) => {
      console.error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threadItems", thread.id] });
    },
  });

  const { mutate: addUserMessage } = useMutation({
    mutationFn: () =>
      Effect.runPromise(
        addUserMessageEffect(thread.id).pipe(
          Effect.provide(ThreadService.Default),
          Effect.provide(MessageService.Default)
        )
      ),
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof addUserMessageEffect>>
    ) => {
      console.error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threadItems", thread.id] });
    },
  });

  if (isLoading) return <div>Loading...</div>;

  if (!items) return <div>Thread not found</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col items-center space-y-4">
          {items.map((item) => {
            if (item._tag === "Message") {
              return <div key={item.id}>{item.id}</div>;
            }

            return (
              <Flashcard key={item.id} flashcard={item} threadId={thread.id} />
            );
          })}
        </div>
      </div>
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
            onClick={() => addFlashcard()}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-label="Add new item"
            >
              <title>Add flashcard</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add flashcard
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
            onClick={() => addAssistantMessage()}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-label="Add new item"
            >
              <title>Add assistant message</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add assistant message
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
            onClick={() => addUserMessage()}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-label="Add new item"
            >
              <title>Add user message</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add user message
          </button>
        </div>
      </div>
    </div>
  );
}
