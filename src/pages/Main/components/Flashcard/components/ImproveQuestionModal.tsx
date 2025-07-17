import { AssistantMessage, TextPart, UserMessage } from "@effect/ai/AiInput";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Effect, Schema } from "effect";
import { jsonrepair } from "jsonrepair";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FlashcardService } from "@/domain/flashcard/service";
import type { Thread } from "@/domain/thread/schema";
import { fileAtom } from "@/pages/Main/atoms/fileAtom";
import { pageAtom } from "@/pages/Main/atoms/pageAtom";
import { AIService, AIServiceComplete } from "@/services/AIService/AIService";
import { PDFService } from "@/services/PDFService";
import type { Flashcard } from "../../../../../domain/flashcard/schema";

const improvedQuestionsSchema = Schema.Struct({
  questions: Schema.Array(Schema.String),
});

function improveQuestionEffect(
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

    const result = yield* aiService.improveQuestion(
      question,
      answer,
      context,
      followups
    );

    const json = yield* Effect.sync(() => JSON.parse(jsonrepair(result)));
    const improvedQuestions = yield* Schema.decodeUnknown(
      improvedQuestionsSchema
    )(json);

    return improvedQuestions.questions.map((q) => `<p>${q}</p>`);
  });

  return program;
}

function updateFlashcardEffect(
  id: Flashcard["id"],
  flashcard: Partial<Flashcard>
) {
  const program = Effect.gen(function* () {
    const flashcardService = yield* FlashcardService;
    const result = yield* flashcardService.update(id, flashcard);
    return result;
  });

  return program;
}

interface ImprovedQuestionCardProps {
  question: string;
  label?: string;
  isOriginal?: boolean;
  onAccept?: () => void;
}

function ImprovedQuestionCard({
  question,
  label,
  isOriginal = false,
  onAccept,
}: ImprovedQuestionCardProps) {
  return (
    <Card className={`w-full p-4 ${isOriginal ? "bg-muted/50" : ""}`}>
      <div className="space-y-2">
        {label && (
          <div className="text-sm font-medium text-muted-foreground">
            {label}
          </div>
        )}
        <div
          className="text-sm"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: we store html in the question
          dangerouslySetInnerHTML={{ __html: question }}
        />
        {!isOriginal && onAccept && (
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={onAccept}>
              Accept
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

type ImproveQuestionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  flashcard: Flashcard;
  threadId: Thread["id"];
};

export function ImproveQuestionModal({
  isOpen,
  onClose,
  flashcard,
  threadId,
}: ImproveQuestionModalProps) {
  const queryClient = useQueryClient();
  const followupTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const [improvedQuestions, setImprovedQuestions] = useState<string[]>([]);
  const [followups, setFollowups] = useState<
    (UserMessage | AssistantMessage)[]
  >([]);

  const { mutate: improveQuestion, isPending } = useMutation({
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
        improveQuestionEffect(question, answer, followups).pipe(
          Effect.provide(AIServiceComplete),
          Effect.provide(PDFService.Default)
        )
      ),
    retry: 0,
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof improveQuestionEffect>>
    ) => {
      console.error("Failed to improve question:", error);
    },
    onSuccess: (result) => {
      setImprovedQuestions([...result]);
    },
  });

  const { mutate: updateFlashcard } = useMutation({
    mutationFn: (update: Partial<Flashcard>) =>
      Effect.runPromise(
        updateFlashcardEffect(flashcard.id, update).pipe(
          Effect.provide(FlashcardService.Default)
        )
      ),
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof updateFlashcardEffect>>
    ) => {
      console.error("Failed to update flashcard:", error);
    },
    onSuccess: () => {
      onClose();
      queryClient.invalidateQueries({
        queryKey: ["threadItems", threadId],
      });
      setImprovedQuestions([]);
      setFollowups([]);
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: we want to reset the improved questions when the flashcard question changes
  useEffect(() => {
    setImprovedQuestions([]);
    setFollowups([]);
  }, [flashcard.question]);

  useEffect(() => {
    if (isOpen && improvedQuestions.length === 0) {
      improveQuestion({
        question: flashcard.question,
        answer: flashcard.answer,
      });
    }
  }, [isOpen, flashcard, improveQuestion, improvedQuestions.length]);

  const handleAccept = (question: string) => {
    updateFlashcard({ question });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Improve Question</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 w-full">
          <ImprovedQuestionCard
            question={flashcard.question}
            label="Original Question"
            isOriginal={true}
          />

          {isPending && (
            <div className="text-center py-4 text-muted-foreground">
              Generating improved questions...
            </div>
          )}
          <div className="flex-1 w-full h-px bg-border transition-colors duration-200" />

          {improvedQuestions.length > 0 && (
            <div className="space-y-3 w-full">
              {improvedQuestions.map((question) => (
                <ImprovedQuestionCard
                  key={question}
                  question={question}
                  onAccept={() => handleAccept(question)}
                />
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Textarea
            ref={followupTextAreaRef}
            disabled={isPending}
            placeholder="Ask a follow-up question to refine the suggestions..."
            className="w-full bg-accent-foreground/70 h-20 resize-none"
            onKeyDown={(e) => {
              console.log(
                "onKeyDown",
                e.key === "Enter" && !e.shiftKey,
                followupTextAreaRef.current?.value.trim()
              );
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
                  ${improvedQuestions.map((a) => `<p>${a}</p>`).join("\n")}
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

                setFollowups((prev) => [
                  ...prev,
                  assistantMessage,
                  userMessage,
                ]);
                improveQuestion({
                  question: flashcard.question,
                  answer: flashcard.answer,
                  followups: [...followups, assistantMessage, userMessage],
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
