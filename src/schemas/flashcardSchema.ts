import { Schema } from "effect";

export const flashcardSchema = Schema.Struct({
	question: Schema.String,
	answer: Schema.String,
	context: Schema.optional(Schema.String),
	id: Schema.String,
	noteId: Schema.optional(Schema.Number),
});

export type Flashcard = typeof flashcardSchema.Type;
