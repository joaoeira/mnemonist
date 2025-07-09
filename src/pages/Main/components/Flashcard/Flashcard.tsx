import { FetchHttpClient } from "@effect/platform";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Effect } from "effect";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Flashcard as FlashcardType } from "../../../../domain/flashcard/schema";
import { FlashcardService } from "../../../../domain/flashcard/service";
import type { Thread } from "../../../../domain/thread/schema";
import {
  AIService,
  AIServiceComplete,
} from "../../../../services/AIService/AIService";
import { AnkiService, AnkiServiceLive } from "../../../../services/AnkiService";
import { PDFService } from "../../../../services/PDFService";
import { fileAtom } from "../../atoms/fileAtom";
import { pageAtom } from "../../atoms/pageAtom";
import RichTextArea from "../FlaschardPanel/components/RichTextArea/RichTextArea";
import { FlashcardContextMenu } from "./components/FlashcardContextMenu";

function updateFlashcardEffect(
  id: FlashcardType["id"],
  flashcard: Partial<FlashcardType>
) {
  const program = Effect.gen(function* () {
    const flashcardService = yield* FlashcardService;
    const result = yield* flashcardService.update(id, flashcard);
    return result;
  });

  return program;
}

function saveFlashcardEffect(flashcard: FlashcardType) {
  const program = Effect.gen(function* () {
    const ankiService = yield* AnkiService;
    const result = yield* ankiService.addNote({
      deckName: "Default",
      front: flashcard.question,
      back: flashcard.answer,
    });
    return result;
  });

  return program;
}

function evaluateFlashcardEffect(question: string, answer: string) {
  const program = Effect.gen(function* () {
    const aiService = yield* AIService;
    const pdfService = yield* PDFService;
    const file = yield* Effect.sync(() => fileAtom.get());
    const page = yield* Effect.sync(() => pageAtom.get());
    if (!file || !page) {
      return yield* Effect.fail(new Error("No file selected"));
    }
    const response = yield* Effect.promise(() => fetch(file.url));
    const arrayBuffer = yield* Effect.promise(() => response.arrayBuffer());
    const context = yield* pdfService.getPageContext(arrayBuffer, page);

    const result = yield* aiService.evaluate(question, answer, context);
    return result;
  });

  return program;
}

function deleteFlashcardEffect(id: FlashcardType["id"]) {
  const program = Effect.gen(function* () {
    const flashcardService = yield* FlashcardService;
    const result = yield* flashcardService.delete(id);
    return result;
  });

  return program;
}

// TODO: this is going to be hell with rerenders bc its invalidating the thread

// I think we should just go with the ids, then have a component do a race on the find, then use that to switch what gets rendered (??)
// can also just memoize everything and check the updated at?
export default function Flashcard({
  flashcard,
  threadId,
}: {
  flashcard: FlashcardType;
  threadId: Thread["id"];
}) {
  const queryClient = useQueryClient();
  const { question, answer } = flashcard;

  const { mutate: updateFlashcard } = useMutation({
    mutationFn: (update: Partial<FlashcardType>) =>
      Effect.runPromise(
        updateFlashcardEffect(flashcard.id, update).pipe(
          Effect.provide(FlashcardService.Default)
        )
      ),
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof updateFlashcardEffect>>
    ) => {
      console.error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["threadItems", threadId],
      });
    },
  });

  const { mutate: saveFlashcard } = useMutation({
    mutationFn: () =>
      Effect.runPromise(
        saveFlashcardEffect(flashcard).pipe(
          Effect.provide(AnkiServiceLive),
          Effect.provide(FetchHttpClient.layer)
        )
      ),
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof saveFlashcardEffect>>
    ) => {
      console.error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["threadItems", threadId],
      });
    },
  });

  const { mutate: evaluateFlashcard } = useMutation({
    mutationFn: ({ question, answer }: { question: string; answer: string }) =>
      Effect.runPromise(
        evaluateFlashcardEffect(question, answer).pipe(
          Effect.provide(AIServiceComplete),
          Effect.provide(PDFService.Default)
        )
      ),
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof evaluateFlashcardEffect>>
    ) => {
      console.error(error);
    },
    onSuccess: (result) => {
      console.log(result);
    },
  });

  const { mutate: deleteFlashcard } = useMutation({
    mutationFn: () =>
      Effect.runPromise(
        deleteFlashcardEffect(flashcard.id).pipe(
          Effect.provide(FlashcardService.Default)
        )
      ),
    onError: (
      error: Effect.Effect.Error<ReturnType<typeof deleteFlashcardEffect>>
    ) => {
      console.error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["threadItems", threadId],
      });
    },
  });

  return (
    <FlashcardContextMenu
      onDelete={() => deleteFlashcard()}
      onCreatePermutations={() => console.log("permutations")}
    >
      <Card className="w-full max-w-2xl mx-2 p-0 overflow-hidden">
        <div>
          <RichTextArea
            value={question}
            onChange={(question) => {
              updateFlashcard({ question });
            }}
            placeholder="Enter your question here..."
          />
          <div className="bg-background h-px min-w-full" />

          <RichTextArea
            value={answer}
            onChange={(answer) => {
              updateFlashcard({ answer });
            }}
            placeholder="Enter your answer here..."
          />

          <div className="flex justify-end space-x-2 p-3 border-t border-gray-200">
            <Button
              onClick={() => {
                evaluateFlashcard({ question, answer });
              }}
            >
              Evaluate
            </Button>

            <Button
              onClick={() => {
                saveFlashcard(undefined, {
                  onSuccess: (noteId) => {
                    updateFlashcard({ noteId });
                  },
                });
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </Card>
    </FlashcardContextMenu>
  );
}
