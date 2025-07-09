import { Schema } from "effect";
import { sessionId } from "../session/schema";

export const documentId = Schema.String.pipe(
	Schema.annotations({
		identifier: "documentId",
	}),
	Schema.brand(Symbol.for("documentId")),
);

export const isDocumentId = (id: string): id is typeof documentId.Type =>
	Schema.is(documentId)(id);

export const documentSchema = Schema.TaggedStruct("Document", {
	id: documentId,
	fingerprint: Schema.String,
	title: Schema.optional(Schema.String),
	author: Schema.optional(Schema.String),
	year: Schema.optional(Schema.Number),
	sessions: Schema.Array(sessionId),
	createdAt: Schema.DateFromSelf,
	updatedAt: Schema.DateFromSelf,
	deletedAt: Schema.optional(Schema.DateFromSelf),
});

export type Document = typeof documentSchema.Type;

export const isDocument = (document: unknown): document is Document =>
	Schema.is(documentSchema)(document);
