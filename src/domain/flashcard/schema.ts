import { Schema } from "effect";

export const flashcardId = Schema.String.pipe(
	Schema.annotations({
		identifier: "flashcardId",
	}),
	Schema.brand(Symbol.for("flashcardId")),
);

export const isFlashcardId = (id: string): id is typeof flashcardId.Type =>
	Schema.is(flashcardId)(id);

export const flashcardSchema = Schema.TaggedStruct("Flashcard", {
	question: Schema.String,
	answer: Schema.String,
	context: Schema.optional(Schema.String),
	id: flashcardId,
	noteId: Schema.optional(Schema.Number),
	createdAt: Schema.DateFromSelf,
	updatedAt: Schema.DateFromSelf,
	deletedAt: Schema.optional(Schema.DateFromSelf),
});

export const isFlashcard = (flashcard: unknown): flashcard is Flashcard =>
	Schema.is(flashcardSchema)(flashcard);

export type Flashcard = typeof flashcardSchema.Type;
