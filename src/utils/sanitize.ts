export function sanitizeFilenamePart(value: string): string {
	return value
		.replace(/[\\/:*?"<>|]/g, " ")
		.replace(/[\u0000-\u001f]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function slugify(value: string): string {
	return sanitizeFilenamePart(value)
		.toLowerCase()
		.replace(/\s+/g, "-");
}

export function normalizeHumanText(value: string): string {
	return value
		.replace(/<[^>]+>/g, " ")
		.replace(/[\u0000-\u001f]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function looksLikeCssNoise(value: string): boolean {
	const lowered = value.toLowerCase();
	return (
		lowered.includes("dynamic-range-limit") ||
		lowered.includes("border-radius") ||
		lowered.includes("box-sizing") ||
		lowered.includes(".css") ||
		lowered.includes("{") ||
		lowered.includes("}")
	);
}

export function truncateText(value: string, maxLength: number): string {
	if (value.length <= maxLength) {
		return value;
	}
	return value.slice(0, maxLength).trim();
}
