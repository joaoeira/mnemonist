import { Schema } from "effect";
import { threadId } from "../thread/schema";

export const sessionId = Schema.String.pipe(
	Schema.annotations({
		identifier: "sessionId",
	}),
	Schema.brand(Symbol.for("sessionId")),
);

export const isSessionId = (id: string): id is typeof sessionId.Type =>
	Schema.is(sessionId)(id);

export const sessionSchema = Schema.TaggedStruct("Session", {
	id: sessionId,
	threads: Schema.Array(threadId),
	createdAt: Schema.DateFromSelf,
	updatedAt: Schema.DateFromSelf,
	deletedAt: Schema.optional(Schema.DateFromSelf),
});

export type Session = typeof sessionSchema.Type;

export const isSession = (session: unknown): session is Session =>
	Schema.is(sessionSchema)(session);
