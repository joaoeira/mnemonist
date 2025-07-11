export function getFormattedFlashcardBack(answer: string, context?: string) {
	return `${answer}${context ? `\n\n<blockquote>${context}</blockquote>` : ""}`;
}
