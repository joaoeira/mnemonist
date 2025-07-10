import {
	HttpClient,
	HttpClientRequest,
	HttpClientResponse,
} from "@effect/platform";
import type {
	RequestError,
	ResponseError,
} from "@effect/platform/HttpClientError";
import { Context, Data, Effect, Layer, Match, Schema } from "effect";
import type { ParseError } from "effect/ParseResult";

export class AnkiConnectionError extends Data.TaggedError(
	"AnkiConnectionError",
)<{
	message: string;
}> {}

export class AnkiConnectError extends Data.TaggedError("AnkiConnectError")<{
	message: string;
}> {}

const AnkiConnectAddNoteResponseSchema = Schema.Struct({
	result: Schema.Number,
	error: Schema.NullOr(Schema.String),
});

const AnkiConnectUpdateNoteResponseSchema = Schema.Struct({
	result: Schema.Null,
	error: Schema.NullOr(Schema.String),
});

const AnkiConnectStoreMediaFileResponseSchema = Schema.Struct({
	result: Schema.String,
	error: Schema.NullOr(Schema.String),
});

const AnkiConnectCanAddNotesResponseSchema = Schema.Struct({
	result: Schema.Array(Schema.Boolean),
	error: Schema.NullOr(Schema.String),
});

const ANKI_CONNECT_URL = "http://localhost:8765";
const ANKI_CONNECT_VERSION = 6;

const convertMathExpressions = (text: string): string => {
	return text.replace(/\$([^$]+)\$/g, "<anki-mathjax>$1</anki-mathjax>");
};

export const hasNoteParams = Schema.TaggedStruct("ByContent", {
	deckName: Schema.String,
	front: Schema.String,
	back: Schema.String,
});

export class AnkiService extends Context.Tag("AnkiService")<
	AnkiService,
	{
		readonly isAvailable: () => Effect.Effect<true, AnkiConnectionError, never>;
		readonly addNote: (args: {
			deckName?: string;
			front: string;
			back: string;
		}) => Effect.Effect<
			number,
			| AnkiConnectionError
			| AnkiConnectError
			| ParseError
			| RequestError
			| ResponseError,
			AnkiService
		>;
		readonly updateNote: (args: {
			noteId: number;
			front: string;
			back: string;
		}) => Effect.Effect<
			null,
			| AnkiConnectionError
			| AnkiConnectError
			| ParseError
			| RequestError
			| ResponseError,
			AnkiService
		>;
		readonly pushNote: (args: {
			noteId?: number;
			front: string;
			back: string;
		}) => Effect.Effect<
			number,
			| AnkiConnectionError
			| AnkiConnectError
			| ParseError
			| RequestError
			| ResponseError,
			AnkiService
		>;
		readonly uploadMedia: (args: {
			shapeId: string;
			base64Files: string[];
		}) => Effect.Effect<
			string[],
			| AnkiConnectionError
			| AnkiConnectError
			| ParseError
			| RequestError
			| ResponseError,
			AnkiService
		>;
		readonly hasNote: (
			params: typeof hasNoteParams.Type,
		) => Effect.Effect<
			boolean,
			| AnkiConnectionError
			| AnkiConnectError
			| ParseError
			| RequestError
			| ResponseError,
			AnkiService
		>;
	}
>() {}

export const AnkiServiceLive = Layer.effect(
	AnkiService,
	Effect.gen(function* () {
		const client = yield* HttpClient.HttpClient;

		return AnkiService.of({
			isAvailable: () =>
				Effect.gen(function* () {
					return yield* client
						.execute(HttpClientRequest.get(ANKI_CONNECT_URL))
						.pipe(
							Effect.andThen(() => Effect.succeed(true as const)),
							Effect.catchAll(() =>
								Effect.fail(
									new AnkiConnectionError({ message: "Anki is not available" }),
								),
							),
						);
				}),
			addNote: ({ deckName, front, back }) =>
				Effect.gen(function* () {
					yield* (yield* AnkiService).isAvailable();

					const processedFront = convertMathExpressions(front);
					const processedBack = convertMathExpressions(back);

					const requestBody = {
						action: "addNote",
						version: ANKI_CONNECT_VERSION,
						params: {
							note: {
								deckName: deckName ?? "Default",
								modelName: "Basic",
								fields: {
									Front: processedFront,
									Back: processedBack,
								},
								options: {
									allowDuplicate: false,
									duplicateScope: "deck",
									duplicateScopeOptions: {
										deckName,
										checkChildren: false,
										checkAllModels: false,
									},
								},
								tags: ["dirac"],
							},
						},
					};

					const response = yield* client.execute(
						HttpClientRequest.post(ANKI_CONNECT_URL).pipe(
							HttpClientRequest.bodyUnsafeJson(requestBody),
						),
					);

					const responseBody = yield* HttpClientResponse.schemaBodyJson(
						AnkiConnectAddNoteResponseSchema,
					)(response);

					if (responseBody.error) {
						return yield* new AnkiConnectError({
							message: responseBody.error,
						});
					}

					return responseBody.result;
				}),
			updateNote: ({ noteId, front, back }) =>
				Effect.gen(function* () {
					yield* (yield* AnkiService).isAvailable();

					const processedFront = convertMathExpressions(front);
					const processedBack = convertMathExpressions(back);

					const requestBody = {
						action: "updateNote",
						version: ANKI_CONNECT_VERSION,
						params: {
							note: {
								id: noteId,
								fields: {
									Front: processedFront,
									Back: processedBack,
								},
							},
						},
					};

					const response = yield* client.execute(
						HttpClientRequest.post(ANKI_CONNECT_URL).pipe(
							HttpClientRequest.bodyUnsafeJson(requestBody),
						),
					);

					const responseBody = yield* HttpClientResponse.schemaBodyJson(
						AnkiConnectUpdateNoteResponseSchema,
					)(response);

					if (responseBody.error) {
						return yield* new AnkiConnectError({
							message: responseBody.error,
						});
					}

					return responseBody.result;
				}),
			pushNote: ({ noteId, front, back }) =>
				Effect.gen(function* () {
					if (noteId) {
						yield* (yield* AnkiService).updateNote({
							noteId,
							front,
							back,
						});
						return noteId;
					} else {
						return yield* (yield* AnkiService).addNote({ front, back });
					}
				}),
			uploadMedia: ({ shapeId, base64Files }) =>
				Effect.gen(function* () {
					yield* (yield* AnkiService).isAvailable();

					const uploadPromises = base64Files.map((base64Data, index) =>
						Effect.gen(function* () {
							const requestBody = {
								action: "storeMediaFile",
								version: ANKI_CONNECT_VERSION,
								params: {
									filename: `${shapeId}_${index}.jpg`,
									data: base64Data.split(",")[1], // split the base64 data to remove the data uri prefix
								},
							};

							const response = yield* client.execute(
								HttpClientRequest.post(ANKI_CONNECT_URL).pipe(
									HttpClientRequest.bodyUnsafeJson(requestBody),
								),
							);

							const responseBody = yield* HttpClientResponse.schemaBodyJson(
								AnkiConnectStoreMediaFileResponseSchema,
							)(response);

							if (responseBody.error) {
								return yield* new AnkiConnectError({
									message: responseBody.error,
								});
							}

							return responseBody.result;
						}),
					);

					return yield* Effect.all(uploadPromises);
				}),
			hasNote: (params) =>
				Effect.gen(function* () {
					yield* (yield* AnkiService).isAvailable();

					return yield* Match.value(params).pipe(
						Match.when({ _tag: "ByContent" }, ({ deckName, front, back }) =>
							Effect.gen(function* () {
								const processedFront = convertMathExpressions(front);
								const processedBack = convertMathExpressions(back);

								const requestBody = {
									action: "canAddNotes",
									version: ANKI_CONNECT_VERSION,
									params: {
										notes: [
											{
												deckName,
												modelName: "Basic",
												fields: {
													Front: processedFront,
													Back: processedBack,
												},
												tags: ["dirac"],
											},
										],
									},
								};

								const response = yield* client.execute(
									HttpClientRequest.post(ANKI_CONNECT_URL).pipe(
										HttpClientRequest.bodyUnsafeJson(requestBody),
									),
								);

								const responseBody = yield* HttpClientResponse.schemaBodyJson(
									AnkiConnectCanAddNotesResponseSchema,
								)(response);

								if (responseBody.error) {
									return yield* new AnkiConnectError({
										message: responseBody.error,
									});
								}

								return !responseBody.result[0];
							}),
						),
						Match.exhaustive,
					);
				}),
		});
	}),
);
