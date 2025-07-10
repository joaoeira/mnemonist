export function getFormattedDocumentFlashcardContext(
	title: string,
	year: number | undefined,
	author: string | undefined,
) {
	if (author && year) {
		// Standard case: authors, title, year
		return `<small style="font-size: 14px;">${author}, "${title}" (${year})</small>`;
	}
	if (author && !year) {
		// Authors but no year
		return `<small style="font-size: 14px;">${author}, "${title}"</small>`;
	}
	if (!author && year) {
		// No authors but has year
		return `<small style="font-size: 14px;">"${title}" (${year})</small>`;
	}
	// No authors, no year - just title
	return `<small style="font-size: 14px;">"${title}"</small><br><br>`;
}
