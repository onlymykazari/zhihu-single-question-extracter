export function sanitizeFilenamePart(value: string): string {
	return value
		.replace(/[\\/:*?"<>|]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function slugify(value: string): string {
	return sanitizeFilenamePart(value)
		.toLowerCase()
		.replace(/\s+/g, "-");
}
