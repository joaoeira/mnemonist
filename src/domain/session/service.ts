import { Data, Effect, Schema } from "effect";
import { Storage } from "../../lib/db";
import type { Document as DocumentType } from "../document/schema";
import { DocumentService } from "../document/service";
import type { threadId } from "../thread/schema";
import { ThreadService } from "../thread/service";
import {
	type Session as SessionType,
	sessionId,
	sessionSchema,
} from "./schema";

class SessionNotFound extends Data.TaggedError("SessionNotFound")<{
	message: string;
	id: string | undefined;
}> {}

class ThreadIdNotFound extends Data.TaggedError("ThreadIdNotFound")<{
	message: string;
	id: string | undefined;
}> {}

class SessionService extends Effect.Service<SessionService>()(
	"domain/SessionService",
	{
		effect: Effect.gen(function* () {
			const { db } = yield* Storage;

			const findById = (id: string) =>
				Effect.gen(function* () {
					const session = yield* Effect.promise(() =>
						db.sessions
							.where("id")
							.equals(id)
							.and((session) => session.deletedAt === undefined)
							.first(),
					);

					if (!session) {
						return yield* Effect.fail(
							new SessionNotFound({
								message: `Session with id ${id} not found`,
								id,
							}),
						);
					}

					return session;
				});

			const update = (id: SessionType["id"], session: Partial<SessionType>) =>
				Effect.gen(function* () {
					const existingSession = yield* findById(id);

					const updatedSession: SessionType = {
						...existingSession,
						...session,
						updatedAt: new Date(),
					};

					yield* Schema.decodeUnknown(sessionSchema)(updatedSession);

					yield* Effect.promise(() => db.sessions.put(updatedSession));

					return updatedSession;
				});

			const addThreadId = (
				id: SessionType["id"],
				threadIdToAdd: typeof threadId.Type,
			) =>
				Effect.gen(function* () {
					const session = yield* findById(id);

					const updatedSession: SessionType = {
						...session,
						threads: [...session.threads, threadIdToAdd],
						updatedAt: new Date(),
					};

					yield* Schema.decodeUnknown(sessionSchema)(updatedSession);

					return yield* update(id, updatedSession);
				});

			return {
				create: (
					documentId: DocumentType["id"],
					session: Omit<SessionType, "id" | "_tag" | `${string}At`>,
				) =>
					Effect.gen(function* () {
						const documentService = yield* DocumentService;
						const threadService = yield* ThreadService;

						yield* documentService.findById(documentId);

						const newSessionId = sessionId.make(crypto.randomUUID());
						const newSession: SessionType = sessionSchema.make({
							id: newSessionId,
							...session,
							createdAt: new Date(),
							updatedAt: new Date(),
							deletedAt: undefined,
						});

						yield* Schema.decodeUnknown(sessionSchema)(newSession);

						yield* documentService.addSessionId(documentId, newSessionId);

						yield* Effect.promise(() => db.sessions.add(newSession));

						const initialThread = yield* threadService.create({
							items: [],
							visible: true,
						});

						yield* addThreadId(newSessionId, initialThread.id);

						return newSession;
					}),
				findById,
				update,
				delete: (id: SessionType["id"]) =>
					update(id, { deletedAt: new Date() }),
				getThreads: (id: SessionType["id"]) =>
					Effect.gen(function* () {
						const session = yield* findById(id);
						const threadService = yield* ThreadService;

						const threads = yield* Effect.all(
							session.threads.map((id) => threadService.findById(id)),
							{ concurrency: "unbounded" },
						);

						return threads;
					}),
				addThreadId,
				removeThreadId: (
					id: SessionType["id"],
					threadIdToRemove: typeof threadId.Type,
				) =>
					Effect.gen(function* () {
						const session = yield* findById(id);

						if (!session.threads.includes(threadIdToRemove)) {
							return yield* Effect.fail(
								new ThreadIdNotFound({
									message: `Thread id ${threadIdToRemove} not found in session ${id}`,
									id,
								}),
							);
						}

						const updatedSession: SessionType = {
							...session,
							threads: session.threads.filter(
								(tid) => tid !== threadIdToRemove,
							),
							updatedAt: new Date(),
						};

						yield* Schema.decodeUnknown(sessionSchema)(updatedSession);

						return yield* update(id, updatedSession);
					}),
			};
		}),
		dependencies: [Storage.Default, ThreadService.Default],
	},
) {}

export { SessionService, SessionNotFound };
