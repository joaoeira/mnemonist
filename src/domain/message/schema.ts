import { AssistantMessage, UserMessage } from "@effect/ai/AiInput";
import { Schema } from "effect";

export const messageId = Schema.String.pipe(
	Schema.annotations({
		identifier: "messageId",
	}),
	Schema.brand(Symbol.for("messageId")),
);

export const isMessageId = (id: string): id is typeof messageId.Type =>
	Schema.is(messageId)(id);

export const messageSchema = Schema.TaggedStruct("Message", {
	id: messageId,
	content: Schema.Union(AssistantMessage, UserMessage),
	createdAt: Schema.DateFromSelf,
	updatedAt: Schema.DateFromSelf,
	deletedAt: Schema.optional(Schema.DateFromSelf),
});

export type Message = typeof messageSchema.Type;

export const isMessage = (message: unknown): message is Message =>
	Schema.is(messageSchema)(message);
