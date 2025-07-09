import { Data, Effect, Schema } from "effect";
import { Storage } from "../../lib/db";
import {
	type Message as MessageType,
	messageId,
	messageSchema,
} from "./schema";

class MessageNotFound extends Data.TaggedError("MessageNotFound")<{
	message: string;
	id: string | undefined;
}> {}

class MessageService extends Effect.Service<MessageService>()(
	"domain/MessageService",
	{
		effect: Effect.gen(function* () {
			const { db } = yield* Storage;

			const findById = (id: string) =>
				Effect.gen(function* () {
					const message = yield* Effect.promise(() =>
						db.messages
							.where("id")
							.equals(id)
							.and((message) => message.deletedAt === undefined)
							.first(),
					);

					if (!message) {
						return yield* Effect.fail(
							new MessageNotFound({
								message: `Message with id ${id} not found`,
								id,
							}),
						);
					}

					return message;
				});

			const update = (id: MessageType["id"], message: Partial<MessageType>) =>
				Effect.gen(function* () {
					const existingMessage = yield* findById(id);

					const updatedMessage: MessageType = {
						...existingMessage,
						...message,
						updatedAt: new Date(),
					};

					yield* Schema.decodeUnknown(messageSchema)(updatedMessage);

					yield* Effect.promise(() => db.messages.put(updatedMessage));

					return updatedMessage;
				});

			return {
				create: (message: Omit<MessageType, "id" | "_tag" | `${string}At`>) =>
					Effect.gen(function* () {
						const newMessage: MessageType = messageSchema.make({
							id: messageId.make(crypto.randomUUID()),
							...message,
							createdAt: new Date(),
							updatedAt: new Date(),
							deletedAt: undefined,
						});

						yield* Schema.decodeUnknown(messageSchema)(newMessage);

						yield* Effect.promise(() => db.messages.add(newMessage));

						return newMessage;
					}),
				findById,
				update,
				delete: (id: MessageType["id"]) =>
					update(id, { deletedAt: new Date() }),
				getContent: (id: MessageType["id"]) =>
					Effect.gen(function* () {
						const message = yield* findById(id);
						return message.content;
					}),
				updateContent: (
					id: MessageType["id"],
					content: MessageType["content"],
				) => update(id, { content }),
			};
		}),
		dependencies: [Storage.Default],
	},
) {}

export { MessageService, MessageNotFound };
