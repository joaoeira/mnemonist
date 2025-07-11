import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Effect, Schema } from "effect";
import { jsonrepair } from "jsonrepair";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FlashcardService } from "@/domain/flashcard/service";
import type { Thread } from "@/domain/thread/schema";
import { fileAtom } from "@/pages/Main/atoms/fileAtom";
import { pageAtom } from "@/pages/Main/atoms/pageAtom";
import { AIService, AIServiceComplete } from "@/services/AIService/AIService";
import { PDFService } from "@/services/PDFService";
import type { Flashcard } from "../../../../../domain/flashcard/schema";

const improvedAnswersSchema = Schema.Struct({
  answers: Schema.Array(Schema.String),
});

function improveAnswerEffect(question: string, answer: string) {
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

    const result = yield* aiService.improveAnswer(question, answer, context);

    const json = yield* Effect.sync(() => JSON.parse(jsonrepair(result)));
    const improvedAnswers = yield* Schema.decodeUnknown(improvedAnswersSchema)(
      json
    );

    return improvedAnswers.answers.map((a) => `<p>${a}</p>`);
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

interface ImprovedAnswerCardProps {
  answer: string;
  label?: string;
  isOriginal?: boolean;
  onAccept?: () => void;
}

function ImprovedAnswerCard({
  answer,
  label,
  isOriginal = false,
  onAccept,
}: ImprovedAnswerCardProps) {
  return (
    <Card className={`w-full p-4 ${isOriginal ? "bg-muted/50" : ""}`}>
      <div className="space-y-2">
        {label && (
          <div className="text-sm font-medium text-muted-foreground">
            {label}
          </div>
        )}
        {/** biome-ignore lint/security/noDangerouslySetInnerHtml: we store html in the answer */}
        <div className="text-sm" dangerouslySetInnerHTML={{ __html: answer }} />
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

type ImproveAnswerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  flashcard: Flashcard;
  threadId: Thread["id"];
};

export function ImproveAnswerModal({
  isOpen,
  onClose,
  flashcard,
  threadId,
}: ImproveAnswerModalProps) {
  const [improvedAnswers, setImprovedAnswers] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { mutate: improveAnswer, isPending } = useMutation({
    mutationFn: ({ question, answer }: { question: string; answer: string }) =>
      Effect.runPromise(
        improveAnswerEffect(question, answer).pipe(
          Effect.provide(AIServiceComplete),
          Effect.provide(PDFService.Default)
        )
      ),
    retry: 0,
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof improveAnswerEffect>>
    ) => {
      console.error("Failed to improve answer:", error);
    },
    onSuccess: (result) => {
      setImprovedAnswers([...result]);
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
      setImprovedAnswers([]);
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: we want to reset the improved questions when the flashcard question changes
  useEffect(() => {
    setImprovedAnswers([]);
  }, [flashcard.answer]);

  useEffect(() => {
    if (isOpen && improvedAnswers.length === 0) {
      improveAnswer({
        question: flashcard.question,
        answer: flashcard.answer,
      });
    }
  }, [isOpen, flashcard, improveAnswer, improvedAnswers.length]);

  const handleAccept = (answer: string) => {
    updateFlashcard({ answer });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Improve Answer</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 w-full">
          <ImprovedAnswerCard
            answer={flashcard.answer}
            label="Original Answer"
            isOriginal={true}
          />

          {isPending && (
            <div className="text-center py-4 text-muted-foreground">
              Generating improved answers...
            </div>
          )}
          <div className="flex-1 w-full h-px bg-border transition-colors duration-200" />

          {improvedAnswers.length > 0 && (
            <div className="space-y-3 w-full">
              {improvedAnswers.map((answer) => (
                <ImprovedAnswerCard
                  key={answer}
                  answer={answer}
                  onAccept={() => handleAccept(answer)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
