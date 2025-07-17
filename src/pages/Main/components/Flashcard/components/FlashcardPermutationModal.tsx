import { AssistantMessage, TextPart, UserMessage } from "@effect/ai/AiInput";
import { FetchHttpClient } from "@effect/platform";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { FlashcardService } from "@/domain/flashcard/service";
import type { Thread } from "@/domain/thread/schema";
import { ThreadService } from "@/domain/thread/service";
import { documentIdAtom } from "@/pages/Main/atoms/documentIdAtom";
import { fileAtom } from "@/pages/Main/atoms/fileAtom";
import { pageAtom } from "@/pages/Main/atoms/pageAtom";
import { AIService, AIServiceComplete } from "@/services/AIService/AIService";
import { AnkiService, AnkiServiceLive } from "@/services/AnkiService";
import { PDFService } from "@/services/PDFService";
import type { Flashcard } from "../../../../../domain/flashcard/schema";
import RichTextArea from "../../FlaschardPanel/components/RichTextArea/RichTextArea";
import { getFormattedDocumentFlashcardContext } from "../utils/getFormattedDocumentFlashcardContext";
import { getFormattedFlashcardBack } from "../utils/getformattedFlashcardBack";

const permutationFlashcardSchema = Schema.Struct({
  question: Schema.String,
  answer: Schema.String,
  id: Schema.String,
  noteId: Schema.optional(Schema.Number),
  context: Schema.optional(Schema.String),
});

type PermutationFlashcard = typeof permutationFlashcardSchema.Type & {
  id: string;
};

const permutationsSchema = Schema.Struct({
  flashcards: Schema.Array(
    permutationFlashcardSchema.pick("question", "answer")
  ),
});

interface PermutationsState {
  permutations: PermutationFlashcard[];
  followups: (UserMessage | AssistantMessage)[];
}

type PermutationsAction =
  | { type: "SET_PERMUTATIONS"; payload: PermutationFlashcard[] }
  | { type: "ADD_PERMUTATION"; payload: PermutationFlashcard }
  | { type: "EDIT_QUESTION"; payload: { id: string; question: string } }
  | { type: "EDIT_ANSWER"; payload: { id: string; answer: string } }
  | { type: "SET_NOTE_ID"; payload: { id: string; noteId: number } }
  | { type: "SET_FOLLOWUPS"; payload: (UserMessage | AssistantMessage)[] }
  | { type: "RESET_FOLLOWUPS" };

function permutationsReducer(
  state: PermutationsState,
  action: PermutationsAction
): PermutationsState {
  switch (action.type) {
    case "SET_PERMUTATIONS":
      return { ...state, permutations: action.payload };
    case "ADD_PERMUTATION":
      return {
        ...state,
        permutations: [...state.permutations, action.payload],
      };
    case "EDIT_QUESTION":
      return {
        ...state,
        permutations: state.permutations.map((p) =>
          p.id === action.payload.id
            ? { ...p, question: action.payload.question }
            : p
        ),
      };
    case "EDIT_ANSWER":
      return {
        ...state,
        permutations: state.permutations.map((p) =>
          p.id === action.payload.id
            ? { ...p, answer: action.payload.answer }
            : p
        ),
      };
    case "SET_NOTE_ID":
      return {
        ...state,
        permutations: state.permutations.map((p) =>
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

const initialPermutationsState: PermutationsState = {
  permutations: [],
  followups: [],
};

function createPermutationsEffect(
  question: string,
  answer: string,
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

    const result = yield* aiService.createPermutations(
      question,
      answer,
      context,
      followups
    );

    const json = yield* Effect.sync(() => JSON.parse(jsonrepair(result)));

    const permutations = yield* Schema.decodeUnknown(permutationsSchema)(json);

    return permutations.flashcards.map((p) => ({
      ...p,
      id: `${Date.now()}-${p.question}`,
      noteId: undefined,
    }));
  });

  return program;
}

function savePermutationFlashcardEffect(
  permutation: PermutationFlashcard,
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
      noteId: permutation.noteId,
      front: `${getFormattedDocumentFlashcardContext(
        title,
        year,
        author
      )}\n\n<p>${permutation.question}</p>`,
      back: getFormattedFlashcardBack(permutation.answer, permutation.context),
    });
    return result;
  });

  return program;
}

function addPermutationFlashcardToThreadEffect(
  permutation: PermutationFlashcard,
  threadId: Thread["id"]
) {
  const program = Effect.gen(function* () {
    const threadService = yield* ThreadService;
    const flashcardService = yield* FlashcardService;

    const flashcard = yield* flashcardService.create({
      question: permutation.question,
      answer: permutation.answer,
      context: permutation.context,
      noteId: undefined,
    });

    yield* threadService.findById(threadId);

    const result = yield* threadService.addItem(threadId, flashcard.id);

    return result;
  });

  return program;
}

interface PermutationFlashcardProps {
  permutation: PermutationFlashcard;
  onEditQuestion: (question: string) => void;
  onEditAnswer: (answer: string) => void;
  threadId: Thread["id"];
}

function PermutationFlashcardComponent({
  permutation,
  onEditQuestion,
  onEditAnswer,
  threadId,
}: PermutationFlashcardProps) {
  const documentId = useAtom(documentIdAtom);
  const queryClient = useQueryClient();

  const { mutate: savePermutationFlashcard } = useMutation({
    mutationFn: () => {
      if (!documentId)
        return Promise.reject(new Error("Document ID not found"));
      return Effect.runPromise(
        savePermutationFlashcardEffect(permutation, documentId).pipe(
          Effect.provide(AnkiServiceLive),
          Effect.provide(FetchHttpClient.layer),
          Effect.provide(DocumentService.Default)
        )
      );
    },
    onError: (
      error: Effect.Effect.Error<
        ReturnType<typeof savePermutationFlashcardEffect>
      >
    ) => {
      console.error(error);
    },
    onSuccess: () => {
      console.log("Permutation flashcard saved successfully");
    },
  });

  const { mutate: addPermutationFlashcardToThread } = useMutation({
    mutationFn: () =>
      Effect.runPromise(
        addPermutationFlashcardToThreadEffect(permutation, threadId).pipe(
          Effect.provide(ThreadService.Default),
          Effect.provide(FlashcardService.Default)
        )
      ),
    onError: (
      error: Effect.Effect.Error<
        ReturnType<typeof addPermutationFlashcardToThreadEffect>
      >
    ) => {
      console.error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["threadItems", threadId],
      });
      console.log("Permutation flashcard added to thread successfully");
    },
  });

  return (
    <Card className="w-full p-0 overflow-hidden">
      <div>
        <RichTextArea
          value={permutation.question}
          onChange={onEditQuestion}
          placeholder="Enter your question here..."
        />
        <div className="bg-background h-px min-w-full" />
        <RichTextArea
          value={permutation.answer}
          onChange={onEditAnswer}
          placeholder="Enter your answer here..."
        />
        <div className="flex justify-end space-x-2 p-3 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={() => addPermutationFlashcardToThread()}
          >
            Add to thread
          </Button>
          <Button onClick={() => savePermutationFlashcard()}>
            {permutation.noteId ? "Update" : "Save"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

type FlashcardPermutationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  flashcard: Flashcard;
  threadId: Thread["id"];
};

export function FlashcardPermutationModal({
  isOpen,
  onClose,
  flashcard,
  threadId,
}: FlashcardPermutationModalProps) {
  const [state, dispatch] = useReducer(
    permutationsReducer,
    initialPermutationsState
  );
  const followupTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: createPermutations, isPending } = useMutation({
    mutationFn: ({
      question,
      answer,
      followups,
    }: {
      question: string;
      answer: string;
      followups?: (UserMessage | AssistantMessage)[];
    }) =>
      Effect.runPromise(
        createPermutationsEffect(question, answer, followups).pipe(
          Effect.provide(AIServiceComplete),
          Effect.provide(PDFService.Default)
        )
      ),
    retry: 0,
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof createPermutationsEffect>>
    ) => {
      console.error(error);
    },
    onSuccess: (result) => {
      dispatch({
        type: "SET_PERMUTATIONS",
        payload: result.map((p) => ({ ...p, context: flashcard.context })),
      });
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: we want to reset the permutations when the flashcard changes
  useEffect(() => {
    dispatch({
      type: "SET_PERMUTATIONS",
      payload: [],
    });
    dispatch({
      type: "RESET_FOLLOWUPS",
    });
  }, [flashcard.question, flashcard.answer]);

  useEffect(() => {
    if (isOpen && state.permutations.length === 0) {
      createPermutations({
        question: flashcard.question,
        answer: flashcard.answer,
      });
    }
  }, [isOpen, flashcard, createPermutations, state.permutations.length]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-2xl max-h-[60vh] overflow-y-auto">
        <div className="flex flex-col gap-4">
          {isPending && (
            <div className="text-center py-4 text-muted-foreground">
              Generating permutation cards...
            </div>
          )}

          {state.permutations.map((permutation) => (
            <PermutationFlashcardComponent
              key={permutation.id}
              permutation={permutation}
              threadId={threadId}
              onEditQuestion={(question) =>
                dispatch({
                  type: "EDIT_QUESTION",
                  payload: { id: permutation.id, question },
                })
              }
              onEditAnswer={(answer) =>
                dispatch({
                  type: "EDIT_ANSWER",
                  payload: { id: permutation.id, answer },
                })
              }
            />
          ))}
        </div>
        <DialogFooter>
          <Textarea
            ref={followupTextAreaRef}
            disabled={isPending}
            placeholder="Ask a follow-up question or provide feedback to refine the permutations..."
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
                  ${state.permutations
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

                createPermutations({
                  question: flashcard.question,
                  answer: flashcard.answer,
                  followups: newFollowups,
                });

                followupTextAreaRef.current.value = "";
              }
            }}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
