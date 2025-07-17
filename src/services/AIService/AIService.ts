import { type AiError, AiLanguageModel, AiTool, AiToolkit } from "@effect/ai";
import {
	type AssistantMessage,
	TextPart,
	UserMessage,
} from "@effect/ai/AiInput";
import type { AiResponse } from "@effect/ai/AiResponse";
import type { Handler } from "@effect/ai/AiTool";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { FetchHttpClient } from "@effect/platform";
import {
	Config,
	type ConfigError,
	Context,
	Effect,
	ExecutionPlan,
	Layer,
	Redacted,
	Schedule,
	Schema,
	type Stream,
} from "effect";
import {
	DocumentIdNotFound,
	DocumentService,
	type DocumentServiceErrors,
} from "@/domain/document/service";
import { documentIdAtom } from "@/pages/Main/atoms/documentIdAtom";
import { augmentQuotePrompt } from "./prompts/augment-quote";
import { createPermutationsPrompt } from "./prompts/create-permutations";
import { evaluate } from "./prompts/evaluate";
import { improveAnswerPrompt } from "./prompts/improve-answer";
import { improveQuestionPrompt } from "./prompts/improve-question";
import { replyPrompt } from "./prompts/reply";
import { suggestFromSelection } from "./prompts/suggest-from-selection";

export const OPENAI_API_LOCALSTORAGE_KEY = "openai-api-key" as const;

export const AILayer = Layer.empty.pipe(
	Layer.provideMerge(
		OpenAiClient.layerConfig({
			apiKey: Config.sync(() =>
				Redacted.make(localStorage.getItem(OPENAI_API_LOCALSTORAGE_KEY) ?? ""),
			),
		}),
	),
	Layer.provideMerge(FetchHttpClient.layer),
);

function getDocumentInformation() {
	return Effect.gen(function* () {
		const documentId = documentIdAtom.get();
		const documentService = yield* DocumentService;

		if (!documentId) {
			return yield* Effect.fail(
				new DocumentIdNotFound({
					message: "Document id not found.",
				}),
			);
		}

		const document = yield* documentService.findById(documentId);

		return `
		<document information>
		${document.title ? `Document: ${document.title}` : ""}
		${document.author ? `Author: ${document.author}` : ""}
		${document.year ? `Year: ${document.year}` : ""}
		</document information>\n
		`;
	}).pipe(Effect.provide(DocumentService.Default));
}

export const gpt41 = OpenAiLanguageModel.model("gpt-4.1");
export const o3 = OpenAiLanguageModel.model("o3");

const CreateFlashcard = AiTool.make("create-flashcard", {
	description:
		"Create a flashcard based on the selected text and user instruction",
	success: Schema.Void,
	failure: Schema.Never,
	parameters: {
		flashcards: Schema.Array(
			Schema.Struct({
				question: Schema.String,
				answer: Schema.String,
			}),
		),
	},
});

export class FlashcardTools extends AiToolkit.make(CreateFlashcard) {}

export class AIService extends Context.Tag("AIService")<
	AIService,
	{
		readonly evaluate: (
			question: string,
			answer: string,
			context: string,
		) => Effect.Effect<
			string,
			ConfigError.ConfigError | AiError.AiError | DocumentServiceErrors,
			never
		>;
		createPermutations: (
			question: string,
			answer: string,
			context: string,
			followups?: (UserMessage | AssistantMessage)[],
		) => Effect.Effect<
			string,
			ConfigError.ConfigError | AiError.AiError | DocumentServiceErrors,
			never
		>;
		improveAnswer: (
			question: string,
			answer: string,
			context: string,
			followups?: (UserMessage | AssistantMessage)[],
		) => Effect.Effect<
			string,
			ConfigError.ConfigError | AiError.AiError | DocumentServiceErrors,
			Effect.Effect.Context<typeof FlashcardTools>
		>;
		improveQuestion: (
			question: string,
			answer: string,
			context: string,
			followups?: (UserMessage | AssistantMessage)[],
		) => Effect.Effect<
			string,
			ConfigError.ConfigError | AiError.AiError | DocumentServiceErrors,
			never
		>;
		augmentQuote: (
			question: string,
			answer: string,
			context: string,
		) => Effect.Effect<
			string,
			ConfigError.ConfigError | AiError.AiError | DocumentServiceErrors,
			never
		>;
		reply: (
			conversation: (UserMessage | AssistantMessage)[],
		) => Stream.Stream<
			AiResponse,
			AiError.AiError,
			Handler<"create-flashcard">
		>;
		suggestFromSelection: (
			selection: string,
			instruction: string,
			context: string,
			followups?: (UserMessage | AssistantMessage)[],
		) => Effect.Effect<
			string,
			ConfigError.ConfigError | AiError.AiError | DocumentServiceErrors,
			never
		>;
	}
>() {}

export const AIServiceLive = Layer.effect(
	AIService,
	Effect.gen(function* () {
		const model = yield* AiLanguageModel.AiLanguageModel;

		return {
			evaluate: (question, answer, context) =>
				Effect.gen(function* () {
					const response = yield* model
						.generateText({
							system: evaluate,
							prompt: `
            Document Information: ${yield* getDocumentInformation()}
						---
            Context: ${context}
            ---
            Question: ${question}
            Answer: ${answer}
            ---
            \n\n
            Please classify the flashcard as good, mediocre, or bad.
            `,
						})
						.pipe(
							Effect.withExecutionPlan(
								ExecutionPlan.make({
									provide: gpt41,
									attempts: 3,
									schedule: Schedule.exponential("250 millis").pipe(
										Schedule.jittered,
									),
								}),
							),
							Effect.provide(AILayer),
						);

					return response.text;
				}),
			createPermutations: (question, answer, context, followups) =>
				Effect.gen(function* () {
					const response = yield* model
						.generateText({
							system: createPermutationsPrompt,
							prompt: [
								UserMessage.make({
									parts: [
										TextPart.make({
											text: `
										Document Information: ${yield* getDocumentInformation()}
										---
										Context: ${context}
										---
										Original Question: ${question}
										Original Answer: ${answer}
										---
										`,
										}),
									],
								}),
								...(followups || []),
							],
						})
						.pipe(
							Effect.withExecutionPlan(
								ExecutionPlan.make({
									provide: gpt41,
									attempts: 3,
									schedule: Schedule.exponential("250 millis").pipe(
										Schedule.jittered,
									),
								}),
							),
							Effect.provide(AILayer),
						);

					return response.text;
				}),
			improveAnswer: (question, answer, context, followups) =>
				Effect.gen(function* () {
					const response = yield* model
						.generateText({
							system: improveAnswerPrompt,
							prompt: [
								UserMessage.make({
									parts: [
										TextPart.make({
											text: `
										Document Information: ${yield* getDocumentInformation()}
										---
										Context: ${context}
										---
										Question: ${question}
										Answer: ${answer}
										---
										`,
										}),
									],
								}),
								...(followups || []),
							],
						})
						.pipe(
							Effect.withExecutionPlan(
								ExecutionPlan.make({
									provide: gpt41,
									attempts: 3,
									schedule: Schedule.exponential("250 millis").pipe(
										Schedule.jittered,
									),
								}),
							),
							Effect.provide(AILayer),
						);

					return response.text;
				}),
			improveQuestion: (question, answer, context, followups) =>
				Effect.gen(function* () {
					const response = yield* model
						.generateText({
							system: improveQuestionPrompt,
							prompt: [
								UserMessage.make({
									parts: [
										TextPart.make({
											text: `
										Document Information: ${yield* getDocumentInformation()}
										---
										Context: ${context}
										---
										Question: ${question}
										Answer: ${answer}
										---
										`,
										}),
									],
								}),
								...(followups || []),
							],
						})
						.pipe(
							Effect.withExecutionPlan(
								ExecutionPlan.make({
									provide: gpt41,
									attempts: 3,
									schedule: Schedule.exponential("250 millis").pipe(
										Schedule.jittered,
									),
								}),
							),
							Effect.provide(AILayer),
						);

					return response.text;
				}),
			augmentQuote: (question, answer, context) =>
				Effect.gen(function* () {
					const response = yield* model
						.generateText({
							system: augmentQuotePrompt,
							prompt: `
						Document Information: ${yield* getDocumentInformation()}
						---
						Context: ${context}
            ---
            Question: ${question}
            Answer: ${answer}
            ---
            \n\n
            Please find a relevant quote from the context that supports the answer following the guidelines in the system prompt.
            `,
						})
						.pipe(
							Effect.withExecutionPlan(
								ExecutionPlan.make({
									provide: gpt41,
									attempts: 3,
									schedule: Schedule.exponential("250 millis").pipe(
										Schedule.jittered,
									),
								}),
							),
							Effect.provide(AILayer),
						);

					return response.text;
				}),

			reply: (conversation) =>
				model.streamText({
					system: replyPrompt,
					prompt: conversation,
					toolkit: FlashcardTools,
				}),
			suggestFromSelection: (selection, instruction, context, followups) =>
				Effect.gen(function* () {
					const response = yield* model
						.generateText({
							system: suggestFromSelection,
							prompt: [
								UserMessage.make({
									parts: [
										TextPart.make({
											text: `
										Document Information: ${yield* getDocumentInformation()}
										---
										Context: ${context}
										---
										Selected Text: ${selection}
										User Instruction: ${instruction}
										---
										`,
										}),
									],
								}),
								...(followups || []),
							],
						})
						.pipe(
							Effect.withExecutionPlan(
								ExecutionPlan.make({
									provide: o3,
									attempts: 3,
									schedule: Schedule.exponential("250 millis").pipe(
										Schedule.jittered,
									),
								}),
							),
							Effect.provide(AILayer),
						);

					return response.text;
				}),
		};
	}),
);

// Complete layer that provides AIService with all its dependencies
export const AIServiceComplete = AIServiceLive.pipe(
	Layer.provide(gpt41),
	Layer.provide(AILayer),
);

export const AIServiceReasoning = AIServiceLive.pipe(
	Layer.provide(o3),
	Layer.provide(AILayer),
);
