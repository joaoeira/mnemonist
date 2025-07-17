import type { AiResponse } from "@effect/ai";
import { AiError } from "@effect/ai/AiError";
import { AssistantMessage, TextPart, UserMessage } from "@effect/ai/AiInput";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Effect, Match, Schema, Stream } from "effect";
import { useRef } from "react";
import type { Flashcard } from "@/domain/flashcard/schema";
import { FlashcardService } from "@/domain/flashcard/service";
import type { Message } from "@/domain/message/schema";
import { MessageService } from "@/domain/message/service";
import type { Thread } from "@/domain/thread/schema";
import { ThreadService } from "@/domain/thread/service";
import { fileAtom } from "@/pages/Main/atoms/fileAtom";
import { pageAtom } from "@/pages/Main/atoms/pageAtom";
import {
  AIService,
  AIServiceReasoning,
  FlashcardTools,
} from "@/services/AIService/AIService";
import { PDFService } from "@/services/PDFService";
import RichTextArea from "../../FlaschardPanel/components/RichTextArea/RichTextArea";

function addUserMessageEffect(threadId: Thread["id"], content: string) {
  const program = Effect.gen(function* () {
    const messageService = yield* MessageService;
    const threadService = yield* ThreadService;

    const userMessage = yield* messageService.create({
      content: UserMessage.make({
        parts: [TextPart.make({ text: content })],
      }),
    });

    yield* threadService.addItem(threadId, userMessage.id);

    return userMessage;
  });

  return program;
}

function addAssistantMessageEffect(threadId: Thread["id"], content: string) {
  const program = Effect.gen(function* () {
    const messageService = yield* MessageService;
    const threadService = yield* ThreadService;

    const assistantMessage = yield* messageService.create({
      content: AssistantMessage.make({
        parts: [TextPart.make({ text: content })],
      }),
    });

    yield* threadService.addItem(threadId, assistantMessage.id);

    return assistantMessage;
  });

  return program;
}

function updateAssistantMessageEffect(
  messageId: Message["id"],
  content: string
) {
  const program = Effect.gen(function* () {
    const messageService = yield* MessageService;

    const message = yield* messageService.update(messageId, {
      content: AssistantMessage.make({
        parts: [TextPart.make({ text: content })],
      }),
    });

    return message;
  });

  return program;
}

function createContextFromThreadEffect(threadId: Thread["id"]) {
  const program = Effect.gen(function* () {
    const threadService = yield* ThreadService;
    const thread = yield* threadService.getItems(threadId);

    const context = yield* Effect.forEach(thread, (item) => {
      const match = Match.type<Message | Flashcard>().pipe(
        Match.tag("Message", (message) => {
          if (message.content._tag === "UserMessage") {
            const userMessage = Schema.decodeUnknownSync(UserMessage)(
              message.content
            );
            return Effect.succeed(userMessage);
          }

          const assistantMessage = Schema.decodeUnknownSync(AssistantMessage)(
            message.content
          );
          return Effect.succeed(assistantMessage);
        }),
        Match.tag("Flashcard", (flashcard) => {
          const text = `<flashcard>
            <question>
              ${flashcard.question}
            </question>
            <answer>
              ${flashcard.answer}
            </answer>
            </flashcard>`;
          return Effect.succeed(
            UserMessage.make({
              parts: [TextPart.make({ text })],
            })
          );
        }),
        Match.exhaustive
      );

      return match(item);
    });

    const pdfService = yield* PDFService;
    const file = yield* Effect.sync(() => fileAtom.get());
    const page = yield* Effect.sync(() => pageAtom.get());

    if (!file || !page) {
      return yield* Effect.fail(new Error("No file or page selected"));
    }

    const arrayBuffer = yield* Effect.promise(() => {
      return fetch(file.url).then((response) => response.arrayBuffer());
    });
    const documentContext = UserMessage.make({
      parts: [
        TextPart.make({
          text: yield* pdfService.getPageContext(arrayBuffer, page),
        }),
      ],
    });

    return [documentContext, ...context];
  });

  return program;
}

function replyEffect(
  threadId: Thread["id"],
  callbacks: {
    onStreamStart: () => void;
    onStreamEnd: () => void;
    onStreamData: (data: AiResponse.AiResponse) => void;
  }
) {
  const program = Effect.gen(function* () {
    const aiService = yield* AIService;

    const context = yield* createContextFromThreadEffect(threadId);

    yield* aiService.reply(context).pipe(
      Stream.onStart(Effect.sync(() => callbacks.onStreamStart())),
      Stream.tap((response) =>
        Effect.sync(() => callbacks.onStreamData(response))
      ),
      Stream.tapError((e) => Effect.sync(() => console.error(e))),
      Stream.onEnd(Effect.sync(() => callbacks.onStreamEnd())),
      Stream.runCollect
    );
  });

  return program.pipe(
    Effect.provide(AIServiceReasoning),
    Effect.provide(ThreadService.Default),
    Effect.provide(MessageService.Default),
    Effect.provide(FlashcardService.Default),
    Effect.provide(PDFService.Default)
  );
}

function addFlashcardsToThreadEffect(
  threadId: Thread["id"],
  flashcards: readonly {
    readonly question: string;
    readonly answer: string;
  }[]
) {
  const program = Effect.gen(function* () {
    const threadService = yield* ThreadService;
    const flashcardService = yield* FlashcardService;

    yield* Effect.all(
      flashcards.map((flashcard) =>
        Effect.gen(function* () {
          const newFlashcard = yield* flashcardService.create({
            question: flashcard.question,
            answer: flashcard.answer,
          });
          yield* threadService.addItem(threadId, newFlashcard.id);
        })
      )
    );
  });

  return program.pipe(
    Effect.provide(FlashcardService.Default),
    Effect.provide(ThreadService.Default)
  );
}

export function ChatTextArea({ threadId }: { threadId: Thread["id"] }) {
  const messageIdRef = useRef<Message["id"] | null>(null);
  const queryClient = useQueryClient();
  const { mutate: addUserMessage } = useMutation({
    mutationFn: (content: string) =>
      Effect.runPromise(
        addUserMessageEffect(threadId, content).pipe(
          Effect.provide(ThreadService.Default),
          Effect.provide(MessageService.Default)
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threadItems", threadId] });
    },
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof addUserMessageEffect>>
    ) => {
      console.error(error);
    },
  });

  const { mutate: updateAssistantMessage } = useMutation({
    mutationFn: ({
      messageId,
      content,
    }: {
      messageId: Message["id"];
      content: string;
    }) =>
      Effect.runPromise(
        updateAssistantMessageEffect(messageId, content).pipe(
          Effect.provide(ThreadService.Default),
          Effect.provide(MessageService.Default)
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threadItems", threadId] });
    },
    onError: (
      error: Effect.Effect.Error<
        ReturnType<typeof updateAssistantMessageEffect>
      >
    ) => {
      console.error(error);
    },
  });

  const { mutate: addAssistantMessage } = useMutation({
    mutationFn: (content: string) =>
      Effect.runPromise(
        addAssistantMessageEffect(threadId, content).pipe(
          Effect.provide(ThreadService.Default),
          Effect.provide(MessageService.Default)
        )
      ),
    onSuccess: (message) => {
      messageIdRef.current = message.id;
      queryClient.invalidateQueries({ queryKey: ["threadItems", threadId] });
    },
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof addAssistantMessageEffect>>
    ) => {
      console.error(error);
    },
  });

  return (
    <RichTextArea
      placeholder="Ask anything"
      className="w-full min-h-16"
      onSubmit={(content) => {
        addUserMessage(content, {
          onSuccess: () => {
            let currentMessage: string = "";
            replyEffect(threadId, {
              onStreamStart: () => {
                addAssistantMessage("");
              },
              onStreamEnd: () => {
                if (messageIdRef.current) {
                  updateAssistantMessage({
                    messageId: messageIdRef.current,
                    content: currentMessage,
                  });
                }
                messageIdRef.current = null;
              },
              onStreamData: (data) => {
                currentMessage += data.text;
                if (messageIdRef.current) {
                  updateAssistantMessage({
                    messageId: messageIdRef.current,
                    content: currentMessage,
                  });
                }
              },
            }).pipe(
              Effect.provide(
                FlashcardTools.toLayer({
                  "create-flashcard": ({ flashcards }) => {
                    return addFlashcardsToThreadEffect(
                      threadId,
                      flashcards
                    ).pipe(
                      Effect.mapError((e) => {
                        return AiError.make({
                          cause: e,
                          module: "AIService",
                          method: "create-flashcard",
                          description: `Failed to create flashcards: ${e.message}`,
                        });
                      })
                    );
                  },
                })
              ),
              Effect.runPromise
            );
          },
        });
      }}
    />
  );
}
