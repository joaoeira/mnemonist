import { useSelector, useStore } from "@xstate/store/react";
import type { Flashcard as FlashcardType } from "../../../../../../schemas/flashcardSchema";
import Flashcard from "../../../Flashcard/Flashcard";

export default function FlashcardPanel() {
  const store = useStore({
    context: {
      flashcards: [] as FlashcardType[],
    },
    on: {
      ADD_FLASHCARD: (context, event: { flashcard: FlashcardType }) => {
        return {
          ...context,
          flashcards: [...context.flashcards, event.flashcard],
        };
      },
    },
  });

  const flashcards = useSelector(store, (state) => state.context.flashcards);

  return (
    <div className="p-2 space-y-2">
      <div>
        {flashcards.map((flashcard) => (
          <Flashcard key={flashcard.id} />
        ))}
        <button
          type="button"
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
          onClick={() => {
            store.send({
              type: "ADD_FLASHCARD",
              flashcard: {
                id: crypto.randomUUID(),
                question: "",
                answer: "",
                context: "",
                noteId: undefined,
              },
            });
          }}
        >
          Add Flashcard
        </button>
      </div>
    </div>
  );
}
