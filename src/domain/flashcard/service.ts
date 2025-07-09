import { Data, Effect, Schema } from "effect";
import { Storage } from "../../lib/db";
import {
	type Flashcard as FlashcardType,
	flashcardId,
	flashcardSchema,
} from "./schema";

class FlashcardNotFound extends Data.TaggedError("FlashcardNotFound")<{
	message: string;
	id: string | undefined;
}> {}

class FlashcardService extends Effect.Service<FlashcardService>()(
	"domain/FlashcardService",
	{
		effect: Effect.gen(function* () {
			const { db } = yield* Storage;

			const findById = (id: string) =>
				Effect.gen(function* () {
					const flashcard = yield* Effect.promise(() =>
						db.flashcards.where("id").equals(id).first(),
					);

					if (!flashcard) {
						return yield* Effect.fail(
							new FlashcardNotFound({
								message: `Flashcard with id ${id} not found`,
								id,
							}),
						);
					}

					return flashcard;
				});

			const update = (
				id: FlashcardType["id"],
				flashcard: Partial<FlashcardType>,
			) =>
				Effect.gen(function* () {
					const existingFlashcard = yield* findById(id);

					const updatedFlashcard: FlashcardType = {
						...existingFlashcard,
						...flashcard,
						updatedAt: new Date(),
					};

					yield* Schema.decodeUnknown(flashcardSchema)(updatedFlashcard);

					yield* Effect.promise(() => db.flashcards.put(updatedFlashcard));

					return updatedFlashcard;
				});

			return {
				create: (
					flashcard: Omit<FlashcardType, "id" | "_tag" | `${string}At`>,
				) =>
					Effect.gen(function* () {
						const newFlashcard: FlashcardType = flashcardSchema.make({
							id: flashcardId.make(crypto.randomUUID()),
							...flashcard,
							createdAt: new Date(),
							updatedAt: new Date(),
							deletedAt: undefined,
						});

						yield* Schema.decodeUnknown(flashcardSchema)(newFlashcard);

						yield* Effect.promise(() => db.flashcards.add(newFlashcard));

						return newFlashcard;
					}),
				findById,
				update,
				delete: (id: FlashcardType["id"]) =>
					update(id, { deletedAt: new Date() }),
				updateQuestion: (id: FlashcardType["id"], question: string) =>
					update(id, { question }),
				updateAnswer: (id: FlashcardType["id"], answer: string) =>
					update(id, { answer }),
				updateContext: (id: FlashcardType["id"], context: string | undefined) =>
					update(id, { context }),
				updateNoteId: (id: FlashcardType["id"], noteId: number | undefined) =>
					update(id, { noteId }),
				getByNoteId: (noteId: number) =>
					Effect.gen(function* () {
						const flashcards = yield* Effect.promise(() =>
							db.flashcards.where("noteId").equals(noteId).toArray(),
						);

						return flashcards;
					}),
			};
		}),
		dependencies: [Storage.Default],
	},
) {}

export { FlashcardService, FlashcardNotFound };
