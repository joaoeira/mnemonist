import { Schema } from "effect";
import { flashcardId } from "../flashcard/schema";
import { messageId } from "../message/schema";

export const threadId = Schema.String.pipe(
	Schema.annotations({
		identifier: "threadId",
	}),
	Schema.brand(Symbol.for("threadId")),
);

export const isThreadId = (id: string): id is typeof threadId.Type =>
	Schema.is(threadId)(id);

export const threadSchema = Schema.TaggedStruct("Thread", {
	id: threadId,
	items: Schema.Array(Schema.Union(messageId, flashcardId)),
	createdAt: Schema.DateFromSelf,
	updatedAt: Schema.DateFromSelf,
	deletedAt: Schema.optional(Schema.DateFromSelf),
	visible: Schema.Boolean,
});

export type Thread = typeof threadSchema.Type;

export const isThread = (thread: unknown): thread is Thread =>
	Schema.is(threadSchema)(thread);
