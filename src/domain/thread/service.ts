import { Data, Effect, Schema } from "effect";
import { Storage } from "../../lib/db";
import type { flashcardId } from "../flashcard/schema";
import { FlashcardService } from "../flashcard/service";
import type { messageId } from "../message/schema";
import { MessageService } from "../message/service";
import { type Thread as ThreadType, threadId, threadSchema } from "./schema";

class ThreadNotFound extends Data.TaggedError("ThreadNotFound")<{
	message: string;
	id: string | undefined;
}> {}

class ItemNotFound extends Data.TaggedError("ItemNotFound")<{
	message: string;
	id: string | undefined;
}> {}

class ThreadService extends Effect.Service<ThreadService>()(
	"domain/ThreadService",
	{
		effect: Effect.gen(function* () {
			const { db } = yield* Storage;

			const findById = (id: string) =>
				Effect.gen(function* () {
					const thread = yield* Effect.promise(() =>
						db.threads
							.where("id")
							.equals(id)
							.and((thread) => thread.deletedAt === undefined)
							.first(),
					);

					if (!thread) {
						return yield* Effect.fail(
							new ThreadNotFound({
								message: `Thread with id ${id} not found`,
								id,
							}),
						);
					}

					return thread;
				});

			const update = (id: ThreadType["id"], thread: Partial<ThreadType>) =>
				Effect.gen(function* () {
					const existingThread = yield* findById(id);

					const updatedThread: ThreadType = {
						...existingThread,
						...thread,
						updatedAt: new Date(),
					};

					yield* Schema.decodeUnknown(threadSchema)(updatedThread);

					yield* Effect.promise(() => db.threads.put(updatedThread));

					return updatedThread;
				});

			return {
				create: (thread: Omit<ThreadType, "id" | "_tag" | `${string}At`>) =>
					Effect.gen(function* () {
						const newThread: ThreadType = threadSchema.make({
							id: threadId.make(crypto.randomUUID()),
							...thread,
							createdAt: new Date(),
							updatedAt: new Date(),
							deletedAt: undefined,
						});

						yield* Schema.decodeUnknown(threadSchema)(newThread);
						yield* Effect.promise(() => db.threads.add(newThread));

						return newThread;
					}),
				findById,
				update,
				delete: (id: ThreadType["id"]) => update(id, { deletedAt: new Date() }),
				getItems: (id: ThreadType["id"]) =>
					Effect.gen(function* () {
						const thread = yield* findById(id);
						const messageService = yield* MessageService;
						const flashcardService = yield* FlashcardService;

						/**
						 * When they come back from the db the ids are strings, and Effect.is is only going to check if its a string
						 * We use race bc we know its at least one of these so the one that resolves successfully is the one we want
						 */

						const items = yield* Effect.all(
							thread.items.map((id) =>
								Effect.race(
									messageService.findById(id),
									flashcardService.findById(id),
								),
							),
							{ concurrency: "unbounded" },
						).pipe(
							Effect.map((items) => {
								return items.filter((item) => !item.deletedAt); // dont return deleted items
							}),
						);

						return items;
					}),
				addItem: (
					id: ThreadType["id"],
					itemToAdd: typeof messageId.Type | typeof flashcardId.Type,
				) =>
					Effect.gen(function* () {
						const thread = yield* findById(id);

						const updatedThread: ThreadType = {
							...thread,
							items: [...thread.items, itemToAdd],
							updatedAt: new Date(),
						};

						yield* Schema.decodeUnknown(threadSchema)(updatedThread);

						return yield* update(id, updatedThread);
					}),
				removeItem: (
					id: ThreadType["id"],
					itemToRemove: typeof messageId.Type | typeof flashcardId.Type,
				) =>
					Effect.gen(function* () {
						const thread = yield* findById(id);

						if (!thread.items.includes(itemToRemove)) {
							return yield* Effect.fail(
								new ItemNotFound({
									message: `Item id ${itemToRemove} not found in thread ${id}`,
									id,
								}),
							);
						}

						const updatedThread: ThreadType = {
							...thread,
							items: thread.items.filter((mid) => mid !== itemToRemove),
							updatedAt: new Date(),
						};

						yield* Schema.decodeUnknown(threadSchema)(updatedThread);

						return yield* update(id, updatedThread);
					}),
				setVisible: (id: ThreadType["id"], visible: boolean) =>
					update(id, { visible }),
			};
		}),
		dependencies: [Storage.Default],
	},
) {}

export { ThreadService, ThreadNotFound, ItemNotFound };
