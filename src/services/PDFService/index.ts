import { Data, Effect, Schema } from "effect";
import * as pdfjsLib from "pdfjs-dist";
import browser from "webextension-polyfill";

const PdfFingerprintNotFound = Data.TaggedError("PdfFingerprintNotFound")<{
	message: string;
}>;

const InvalidPageNumber = Data.TaggedError("InvalidPageNumber")<{
	pageNumber: number;
	totalPages: number;
	message: string;
}>;

pdfjsLib.GlobalWorkerOptions.workerSrc = browser.runtime.getURL(
	"node_modules/pdfjs-dist/build/pdf.worker.min.js",
);

const validatePageNumber = (pageNumber: number, totalPages: number) =>
	Effect.gen(function* () {
		const validatedPageNumber = yield* Schema.decode(
			Schema.Int.pipe(
				Schema.greaterThanOrEqualTo(1),
				Schema.lessThanOrEqualTo(totalPages),
			),
		)(pageNumber);
		return validatedPageNumber;
	});

/**
 * Creates a managed PDF document resource that will be automatically cleaned up
 * @param pdfData - The PDF file as a Uint8Array, ArrayBuffer, or similar format
 * @returns Effect that provides a scoped PDF document
 */
const acquirePdfDocument = (pdfData: Uint8Array | ArrayBuffer) =>
	Effect.acquireRelease(
		Effect.promise(() => {
			const loadingTask = pdfjsLib.getDocument({
				data: new Uint8Array(pdfData.slice(0)),
				disableAutoFetch: true,
				disableStream: true,
				disableRange: true,
			});
			return loadingTask.promise;
		}),
		(pdfDocument) =>
			Effect.sync(() => {
				pdfDocument.destroy();
			}),
	);

class PDFService extends Effect.Service<PDFService>()("PDFService", {
	effect: Effect.sync(() => ({
		/**
		 * Extracts a fingerprint from a PDF file using pdfjs
		 * @param pdfData - The PDF file as a Uint8Array, ArrayBuffer, or similar format
		 * @returns Effect that resolves to a string representing the PDF's unique fingerprint
		 */
		fingerprint: (pdfData: Uint8Array | ArrayBuffer) =>
			Effect.gen(function* () {
				const pdfDocument = yield* acquirePdfDocument(pdfData);

				const fingerprints = pdfDocument.fingerprints;
				const fingerprint = fingerprints[0];

				if (!fingerprint) {
					return yield* new PdfFingerprintNotFound({
						message: "No fingerprint found in PDF",
					});
				}

				return fingerprint;
			}).pipe(Effect.scoped),

		/**
		 * Gets the total number of pages in a PDF document
		 * @param pdfData - The PDF file as a Uint8Array, ArrayBuffer, or similar format
		 * @returns Effect that resolves to the number of pages in the PDF
		 */
		getPageCount: (pdfData: Uint8Array | ArrayBuffer) =>
			Effect.gen(function* () {
				const pdfDocument = yield* acquirePdfDocument(pdfData);
				return pdfDocument.numPages;
			}).pipe(Effect.scoped),

		/**
		 * Extracts text content from a specific page
		 * @param pdfData - The PDF file as a Uint8Array, ArrayBuffer, or similar format
		 * @param pageNumber - The page number (1-based indexing)
		 * @returns Effect that resolves to the text content of the specified page
		 */
		getPageText: (pdfData: Uint8Array | ArrayBuffer, pageNumber: number) =>
			Effect.gen(function* () {
				const pdfDocument = yield* acquirePdfDocument(pdfData);
				const totalPages = pdfDocument.numPages;

				const validatedPageNumber = yield* validatePageNumber(
					pageNumber,
					totalPages,
				).pipe(
					Effect.catchAll(() => {
						return Effect.fail(
							new InvalidPageNumber({
								pageNumber,
								totalPages,
								message: `Page number must be between 1 and ${totalPages}, but received ${pageNumber}`,
							}),
						);
					}),
				);

				const page = yield* Effect.promise(() =>
					pdfDocument.getPage(validatedPageNumber),
				);
				const textContent = yield* Effect.promise(() => page.getTextContent());

				const pageText = textContent.items
					.map((item) => {
						if ("str" in item) {
							return item.str;
						}
						return "";
					})
					.join(" ");

				return pageText;
			}).pipe(Effect.scoped),

		/**
		 * Gets page text with surrounding context pages
		 * @param pdfData - The PDF file as a Uint8Array, ArrayBuffer, or similar format
		 * @param pageNumber - The page number (1-based indexing)
		 * @returns Effect that resolves to formatted text with context and current page
		 */
		getPageContext: (pdfData: Uint8Array | ArrayBuffer, pageNumber: number) =>
			Effect.gen(function* () {
				const pdfDocument = yield* acquirePdfDocument(pdfData);
				const totalPages = pdfDocument.numPages;

				const validatedPageNumber = yield* validatePageNumber(
					pageNumber,
					totalPages,
				).pipe(
					Effect.catchAll(() => {
						return Effect.fail(
							new InvalidPageNumber({
								pageNumber,
								totalPages,
								message: `Page number must be between 1 and ${totalPages}, but received ${pageNumber}`,
							}),
						);
					}),
				);

				const contextStart = Math.max(1, validatedPageNumber - 5);
				const contextEnd = Math.min(totalPages, validatedPageNumber + 5);

				const contextPages: number[] = [];
				for (let i = contextStart; i <= contextEnd; i++) {
					if (i !== validatedPageNumber) {
						contextPages.push(i);
					}
				}

				const getPageTextSafe = (pageNum: number) =>
					Effect.gen(function* () {
						const page = yield* Effect.promise(() =>
							pdfDocument.getPage(pageNum),
						);
						const textContent = yield* Effect.promise(() =>
							page.getTextContent(),
						);

						const pageText = textContent.items
							.map((item) => {
								if ("str" in item) {
									return item.str;
								}
								return "";
							})
							.join(" ");

						return pageText;
					}).pipe(Effect.catchAll(() => Effect.succeed("")));

				const contextTexts = yield* Effect.all(
					contextPages.map((pageNum) => getPageTextSafe(pageNum)),
					{ concurrency: "unbounded" },
				);

				const currentPageText = yield* getPageTextSafe(validatedPageNumber);

				const contextString = contextTexts.join(" ");
				const result = `<context>\n${contextString}\n</context>\n<current page>\n${currentPageText}\n</current page>`;

				return result;
			}).pipe(Effect.scoped),
	})),
}) {}

export { PDFService };
