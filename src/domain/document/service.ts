import { Data, Effect, Schema } from "effect";
import { Storage } from "../../lib/db";
import { PDFService } from "../../services/PDFService";
import type { sessionId } from "../session/schema";
import { SessionService } from "../session/service";
import {
	type Document as DocumentType,
	documentId,
	documentSchema,
} from "./schema";

class DocumentNotFound extends Data.TaggedError("DocumentNotFound")<{
	message: string;
	id: string | undefined;
	fingerprint: string | undefined;
}> {}

class SessionIdNotFound extends Data.TaggedError("SessionIdNotFound")<{
	message: string;
	id: string | undefined;
}> {}

class DocumentService extends Effect.Service<DocumentService>()(
	"domain/DocumentService",
	{
		effect: Effect.gen(function* () {
			const { db } = yield* Storage;

			const findByFingerprint = (fingerprint: string) =>
				Effect.gen(function* () {
					const document = yield* Effect.promise(() =>
						db.documents
							.where("fingerprint")
							.equals(fingerprint)
							.and((doc) => doc.deletedAt === undefined)
							.first(),
					);

					if (!document) {
						return yield* Effect.fail(
							new DocumentNotFound({
								message: `Document with fingerprint ${fingerprint} not found`,
								fingerprint,
								id: undefined,
							}),
						);
					}

					return document;
				});

			const findById = (id: string) =>
				Effect.gen(function* () {
					const document = yield* Effect.promise(() =>
						db.documents
							.where("id")
							.equals(id)
							.and((doc) => doc.deletedAt === undefined)
							.first(),
					);

					if (!document) {
						return yield* Effect.fail(
							new DocumentNotFound({
								message: `Document with id ${id} not found`,
								id,
								fingerprint: undefined,
							}),
						);
					}

					return document;
				});

			const getSessions = (id: DocumentType["id"]) =>
				Effect.gen(function* () {
					const document = yield* findById(id);
					const sessionService = yield* SessionService;

					if (!document) {
						return yield* Effect.fail(
							new DocumentNotFound({
								message: `Document with id ${id} not found`,
								id,
								fingerprint: undefined,
							}),
						);
					}

					const sessionIds = document.sessions;

					const sessions = yield* Effect.all(
						sessionIds.map((id) => sessionService.findById(id)),
						{
							concurrency: "unbounded",
						},
					);

					return sessions;
				});

			const update = (
				id: DocumentType["id"],
				document: Partial<DocumentType>,
			) =>
				Effect.gen(function* () {
					const existingDocument = yield* findById(id);

					const updatedDocument: DocumentType = {
						...existingDocument,
						...document,
					};

					yield* Schema.decodeUnknown(documentSchema)(updatedDocument);

					yield* Effect.promise(() => db.documents.put(updatedDocument));

					return updatedDocument;
				});

			return {
				create: (
					file: File,
					document: Omit<
						DocumentType,
						"id" | "fingerprint" | "_tag" | `${string}At`
					>,
				) =>
					Effect.gen(function* () {
						const pdfService = yield* PDFService;

						const fingerprint = yield* pdfService.fingerprint(
							yield* Effect.promise(async () => {
								const buffer = await file.arrayBuffer();
								const uint8Array = new Uint8Array(buffer);

								return uint8Array;
							}),
						);

						// Check first through the fingerprint if we have seen this document before
						// and if so just return the existing document
						const existingDocument = yield* findByFingerprint(fingerprint).pipe(
							Effect.orElse(() => Effect.succeed(undefined)),
						);

						if (existingDocument) return existingDocument;

						const newDocument: DocumentType = documentSchema.make({
							id: documentId.make(crypto.randomUUID()),
							...document,
							fingerprint,
							createdAt: new Date(),
							updatedAt: new Date(),
							deletedAt: undefined,
						});

						yield* Schema.decodeUnknown(documentSchema)(newDocument);

						yield* Effect.promise(() => db.documents.add(newDocument));

						return newDocument;
					}),
				findById,
				findByFingerprint,
				update,
				delete: (id: DocumentType["id"]) =>
					update(id, { deletedAt: new Date() }),
				getSessions,
				addSessionId: (
					id: DocumentType["id"],
					sessionIdToAdd: typeof sessionId.Type,
				) =>
					Effect.gen(function* () {
						const document = yield* findById(id);

						const updatedDocument: DocumentType = {
							...document,
							sessions: [...document.sessions, sessionIdToAdd],
							updatedAt: new Date(),
						};

						yield* Schema.decodeUnknown(documentSchema)(updatedDocument);

						return yield* update(id, updatedDocument);
					}),
				removeSessionId: (
					id: DocumentType["id"],
					sessionIdToRemove: typeof sessionId.Type,
				) =>
					Effect.gen(function* () {
						const document = yield* findById(id);

						if (!document.sessions.includes(sessionIdToRemove)) {
							return yield* Effect.fail(
								new SessionIdNotFound({
									message: `Session id ${sessionIdToRemove} not found in document ${id}`,
									id,
								}),
							);
						}

						const updatedDocument: DocumentType = {
							...document,
							sessions: document.sessions.filter(
								(sid) => sid !== sessionIdToRemove,
							),
							updatedAt: new Date(),
						};

						yield* Schema.decodeUnknown(documentSchema)(updatedDocument);

						return yield* update(id, updatedDocument);
					}),
			};
		}),
		dependencies: [Storage.Default, PDFService.Default, SessionService.Default],
	},
) {}

export { DocumentService };
