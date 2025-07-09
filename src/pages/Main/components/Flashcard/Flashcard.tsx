import { FetchHttpClient } from "@effect/platform";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Effect } from "effect";
import type { Flashcard as FlashcardType } from "../../../../domain/flashcard/schema";
import { FlashcardService } from "../../../../domain/flashcard/service";
import { Thread } from "../../../../domain/thread/schema";
import {
  AIService,
  AIServiceComplete,
} from "../../../../services/AIService/AIService";
import { AnkiService, AnkiServiceLive } from "../../../../services/AnkiService";
import { PDFService } from "../../../../services/PDFService";
import { fileAtom } from "../../atoms/fileAtom";
import { pageAtom } from "../../atoms/pageAtom";
import RichTextArea from "../FlaschardPanel/components/RichTextArea/RichTextArea";

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

  return (
    <div className="w-full max-w-2xl mx-2 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="p-2 space-y-2">
        <div className="border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          <RichTextArea
            value={question}
            onChange={(question) => {
              updateFlashcard({ question });
            }}
            placeholder="Enter your question here..."
          />
        </div>

        <div className="border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          <RichTextArea
            value={answer}
            onChange={(answer) => {
              updateFlashcard({ answer });
            }}
            placeholder="Enter your answer here..."
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            onClick={() => {
              saveFlashcard(undefined, {
                onSuccess: (noteId) => {
                  updateFlashcard({ noteId });
                },
              });
            }}
          >
            Save Flashcard
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ml-2"
            onClick={() => {
              const program = Effect.gen(function* () {
                const aiService = yield* AIService;
                const pdfService = yield* PDFService;
                const file = yield* Effect.sync(() => fileAtom.get());
                const page = yield* Effect.sync(() => pageAtom.get());
                if (!file || !page) {
                  return yield* Effect.fail(new Error("No file selected"));
                }
                const response = yield* Effect.promise(() => fetch(file.url));
                const arrayBuffer = yield* Effect.promise(() =>
                  response.arrayBuffer()
                );
                const context = yield* pdfService.getPageContext(
                  arrayBuffer,
                  page
                );

                const result = yield* aiService.evaluate(
                  question,
                  answer,
                  context
                );
                console.log(result);
              });

              Effect.runPromise(
                program.pipe(
                  Effect.catchAll(() => Effect.succeed("error")),
                  Effect.provide(AIServiceComplete),
                  Effect.provide(PDFService.Default)
                )
              );
            }}
          >
            Evaluate
          </button>
        </div>
      </div>
    </div>
  );
}
