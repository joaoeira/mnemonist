import { AssistantMessage, TextPart, UserMessage } from "@effect/ai/AiInput";
import { FetchHttpClient } from "@effect/platform";
import { useMutation } from "@tanstack/react-query";
import { useAtom } from "@xstate/store/react";
import { Effect, Schema } from "effect";
import { jsonrepair } from "jsonrepair";
import { useEffect, useReducer, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Document } from "@/domain/document/schema";
import { DocumentService } from "@/domain/document/service";
import { documentIdAtom } from "@/pages/Main/atoms/documentIdAtom";
import { fileAtom } from "@/pages/Main/atoms/fileAtom";
import { pageAtom } from "@/pages/Main/atoms/pageAtom";
import { AIService, AIServiceReasoning } from "@/services/AIService/AIService";
import { AnkiService, AnkiServiceLive } from "@/services/AnkiService";
import { PDFService } from "@/services/PDFService";
import RichTextArea from "../../../FlaschardPanel/components/RichTextArea/RichTextArea";
import { getFormattedDocumentFlashcardContext } from "../../../Flashcard/utils/getFormattedDocumentFlashcardContext";
import { getFormattedFlashcardBack } from "../../../Flashcard/utils/getformattedFlashcardBack";

const SuggestedFlashcardSchema = Schema.Struct({
  question: Schema.String,
  answer: Schema.String,
  id: Schema.String,
  noteId: Schema.optional(Schema.Number),
  context: Schema.optional(Schema.String),
});

type SuggestedFlashcard = typeof SuggestedFlashcardSchema.Type & {
  id: string;
};

const suggestedFlashcardsSchema = Schema.Struct({
  flashcards: Schema.Array(SuggestedFlashcardSchema.pick("question", "answer")),
});

interface SuggestedFlashcardsState {
  suggestedFlashcards: SuggestedFlashcard[];
  followups: (UserMessage | AssistantMessage)[];
}

type SuggestedFlashcardsAction =
  | { type: "SET_SUGGESTED_FLASHCARDS"; payload: SuggestedFlashcard[] }
  | { type: "ADD_SUGGESTED_FLASHCARD"; payload: SuggestedFlashcard }
  | { type: "EDIT_QUESTION"; payload: { id: string; question: string } }
  | { type: "EDIT_ANSWER"; payload: { id: string; answer: string } }
  | { type: "SET_NOTE_ID"; payload: { id: string; noteId: number } }
  | { type: "SET_FOLLOWUPS"; payload: (UserMessage | AssistantMessage)[] }
  | { type: "RESET_FOLLOWUPS" };

function suggestedFlashcardsReducer(
  state: SuggestedFlashcardsState,
  action: SuggestedFlashcardsAction
): SuggestedFlashcardsState {
  switch (action.type) {
    case "SET_SUGGESTED_FLASHCARDS":
      return { ...state, suggestedFlashcards: action.payload };
    case "ADD_SUGGESTED_FLASHCARD":
      return {
        ...state,
        suggestedFlashcards: [...state.suggestedFlashcards, action.payload],
      };
    case "EDIT_QUESTION":
      return {
        ...state,
        suggestedFlashcards: state.suggestedFlashcards.map((p) =>
          p.id === action.payload.id
            ? { ...p, question: action.payload.question }
            : p
        ),
      };
    case "EDIT_ANSWER":
      return {
        ...state,
        suggestedFlashcards: state.suggestedFlashcards.map((p) =>
          p.id === action.payload.id
            ? { ...p, answer: action.payload.answer }
            : p
        ),
      };
    case "SET_NOTE_ID":
      return {
        ...state,
        suggestedFlashcards: state.suggestedFlashcards.map((p) =>
          p.id === action.payload.id
            ? { ...p, noteId: action.payload.noteId }
            : p
        ),
      };
    case "SET_FOLLOWUPS":
      return {
        ...state,
        followups: action.payload,
      };
    case "RESET_FOLLOWUPS":
      return {
        ...state,
        followups: [],
      };
    default:
      return state;
  }
}

const initialSuggestedFlashcardsState: SuggestedFlashcardsState = {
  suggestedFlashcards: [],
  followups: [],
};

function createSuggestedFlashcardsEffect(
  selection: string,
  instruction: string,
  followups?: (UserMessage | AssistantMessage)[]
) {
  const program = Effect.gen(function* () {
    const aiService = yield* AIService;
    const pdfService = yield* PDFService;
    const file = yield* Effect.sync(() => fileAtom.get());
    const page = yield* Effect.sync(() => pageAtom.get());
    if (!file) {
      return yield* Effect.fail(new Error("No file selected"));
    }

    if (!page) {
      return yield* Effect.fail(new Error("No page selected"));
    }

    const response = yield* Effect.promise(() => fetch(file.url));
    const arrayBuffer = yield* Effect.promise(() => response.arrayBuffer());
    const context = yield* pdfService.getPageContext(arrayBuffer, page);

    const result = yield* aiService.suggestFromSelection(
      selection,
      instruction,
      context,
      followups
    );

    const json = yield* Effect.sync(() => JSON.parse(jsonrepair(result)));

    const suggestedFlashcards = yield* Schema.decodeUnknown(
      suggestedFlashcardsSchema
    )(json);

    return suggestedFlashcards.flashcards.map((p) => ({
      ...p,
      id: `${Date.now()}-${p.question}`,
      noteId: undefined,
    }));
  });

  return program;
}

function saveSuggestedFlashcardEffect(
  suggestedFlashcard: SuggestedFlashcard,
  documentId: Document["id"]
) {
  const program = Effect.gen(function* () {
    const ankiService = yield* AnkiService;
    const documentService = yield* DocumentService;
    const document = yield* documentService.findById(documentId);

    if (!document) {
      return yield* Effect.fail(new Error("Document not found"));
    }

    const title = document.title;
    if (!title) {
      return yield* Effect.fail(new Error("Document title not found"));
    }
    const year = document.year;
    const author = document.author;

    const result = yield* ankiService.pushNote({
      noteId: suggestedFlashcard.noteId,
      front: `${getFormattedDocumentFlashcardContext(title, year, author)}\n\n${
        suggestedFlashcard.question
      }`,
      back: getFormattedFlashcardBack(
        suggestedFlashcard.answer,
        suggestedFlashcard.context
      ),
    });
    return result;
  });

  return program;
}

interface SuggestedFlashcardProps {
  suggestedFlashcard: SuggestedFlashcard;
  onEditQuestion: (question: string) => void;
  onEditAnswer: (answer: string) => void;
}

function SuggestedFlashcardComponent({
  suggestedFlashcard,
  onEditQuestion,
  onEditAnswer,
}: SuggestedFlashcardProps) {
  const documentId = useAtom(documentIdAtom);
  const { mutate: saveSuggestedFlashcard } = useMutation({
    mutationFn: () => {
      if (!documentId) {
        return Promise.reject(new Error("Document ID not found"));
      }
      return Effect.runPromise(
        saveSuggestedFlashcardEffect(suggestedFlashcard, documentId).pipe(
          Effect.provide(AnkiServiceLive),
          Effect.provide(FetchHttpClient.layer),
          Effect.provide(DocumentService.Default)
        )
      );
    },
    onError: (
      error: Effect.Effect.Error<
        ReturnType<typeof saveSuggestedFlashcardEffect>
      >
    ) => {
      console.error(error);
    },
    onSuccess: () => {
      console.log("SuggestedFlashcard flashcard saved successfully");
    },
  });

  return (
    <Card className="w-full p-0 overflow-hidden">
      <div>
        <RichTextArea
          value={suggestedFlashcard.question}
          onChange={onEditQuestion}
          placeholder="Enter your question here..."
        />
        <div className="bg-background h-px min-w-full" />
        <RichTextArea
          value={suggestedFlashcard.answer}
          onChange={onEditAnswer}
          placeholder="Enter your answer here..."
        />
        <div className="flex justify-end space-x-2 p-3 border-t border-gray-200">
          <Button onClick={() => saveSuggestedFlashcard()}>Add</Button>
        </div>
      </div>
    </Card>
  );
}

type FlashcardSuggestedFlashcardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selection: string;
};

export function FlashcardSuggestedFlashcardModal({
  isOpen,
  onClose,
  selection,
}: FlashcardSuggestedFlashcardModalProps) {
  const [state, dispatch] = useReducer(
    suggestedFlashcardsReducer,
    initialSuggestedFlashcardsState
  );
  const followupTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: createSuggestedFlashcards, isPending } = useMutation({
    mutationFn: ({
      selection,
      instruction,
      followups,
    }: {
      selection: string;
      instruction: string;
      followups?: (UserMessage | AssistantMessage)[];
    }) =>
      Effect.runPromise(
        createSuggestedFlashcardsEffect(selection, instruction, followups).pipe(
          Effect.provide(AIServiceReasoning),
          Effect.provide(PDFService.Default)
        )
      ),
    retry: 0,
    onError: (
      error: Effect.Effect.Error<
        ReturnType<typeof createSuggestedFlashcardsEffect>
      >
    ) => {
      console.error(error);
    },
  });

  useEffect(() => {
    if (isOpen && state.suggestedFlashcards.length === 0) {
      createSuggestedFlashcards(
        {
          selection,
          instruction:
            "Create the best flashcards for the following selection.",
        },
        {
          onSuccess: (result) => {
            dispatch({
              type: "SET_SUGGESTED_FLASHCARDS",
              payload: result,
            });
          },
        }
      );
    }

    if (!isOpen) {
      dispatch({
        type: "SET_SUGGESTED_FLASHCARDS",
        payload: [],
      });
      dispatch({
        type: "RESET_FOLLOWUPS",
      });
    }
  }, [
    isOpen,
    selection,
    createSuggestedFlashcards,
    state.suggestedFlashcards.length,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-2xl max-h-[60vh] overflow-y-auto">
        <div className="flex flex-col gap-4">
          {isPending && (
            <div className="text-center py-4 text-muted-foreground">
              Generating suggested flashcards...
            </div>
          )}

          {state.suggestedFlashcards.map((suggestedFlashcard) => (
            <SuggestedFlashcardComponent
              key={suggestedFlashcard.id}
              suggestedFlashcard={suggestedFlashcard}
              onEditQuestion={(question) =>
                dispatch({
                  type: "EDIT_QUESTION",
                  payload: { id: suggestedFlashcard.id, question },
                })
              }
              onEditAnswer={(answer) =>
                dispatch({
                  type: "EDIT_ANSWER",
                  payload: { id: suggestedFlashcard.id, answer },
                })
              }
            />
          ))}
        </div>
        <DialogFooter>
          <Textarea
            ref={followupTextAreaRef}
            disabled={isPending}
            placeholder="Ask a follow-up question or provide feedback to refine the flashcards..."
            className="w-full bg-accent-foreground/70 h-20 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (
                  !followupTextAreaRef.current ||
                  isPending ||
                  followupTextAreaRef.current.value.trim() === ""
                )
                  return;

                const assistantMessage = AssistantMessage.make({
                  parts: [
                    TextPart.make({
                      text: `<previous suggestions>\n
                  ${state.suggestedFlashcards
                    .map((p) => `Question: ${p.question}\nAnswer: ${p.answer}`)
                    .join("\n\n")}
                  </previous suggestions>\n
                  `,
                    }),
                  ],
                });

                const userMessage = UserMessage.make({
                  parts: [
                    TextPart.make({
                      text: followupTextAreaRef.current?.value.trim(),
                    }),
                  ],
                });

                const newFollowups = [
                  ...state.followups,
                  assistantMessage,
                  userMessage,
                ];

                dispatch({
                  type: "SET_FOLLOWUPS",
                  payload: newFollowups,
                });

                createSuggestedFlashcards(
                  {
                    selection,
                    instruction:
                      "Create the best flashcards for the following selection.",
                    followups: newFollowups,
                  },
                  {
                    onSuccess: (result) => {
                      dispatch({
                        type: "SET_SUGGESTED_FLASHCARDS",
                        payload: result,
                      });
                    },
                  }
                );

                followupTextAreaRef.current.value = "";
              }
            }}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
