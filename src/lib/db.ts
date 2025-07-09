import Dexie, { type EntityTable } from "dexie";
import { Effect } from "effect";
import type { Document } from "../domain/document/schema";
import type { Flashcard } from "../domain/flashcard/schema";
import type { Message } from "../domain/message/schema";
import type { Session } from "../domain/session/schema";
import type { Thread } from "../domain/thread/schema";

const db = new Dexie("FermiReader") as Dexie & {
	documents: EntityTable<Document, "id">;
	threads: EntityTable<Thread, "id">;
	flashcards: EntityTable<Flashcard, "id">;
	messages: EntityTable<Message, "id">;
	sessions: EntityTable<Session, "id">;
};

/**
 * https://dexie.org/docs/Version/Version.stores()
 * db.version(1).stores({
  files: "&id, blobId, name, createdAt, updatedAt"
            ^     ^      ^
            |     |      |_ regular index
            |     |_ regular index
            |_ auto-incrementing primary key (++)
});
 */

db.version(1).stores({
	documents: "++id, fingerprint, createdAt, updatedAt",
	threads: "++id, createdAt, updatedAt, visible",
	flashcards: "++id, noteId",
	messages: "++id",
	sessions: "++id, documentId, createdAt, updatedAt",
});

class Storage extends Effect.Service<Storage>()("lib/Storage", {
	effect: Effect.gen(function* () {
		return {
			db: yield* Effect.succeed(db),
		};
	}),
	dependencies: [],
}) {}

export { Storage, db };
