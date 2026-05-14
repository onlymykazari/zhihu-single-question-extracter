export function parseTags(raw: string): string[] {
	return raw
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);
}

export function mergeTags(defaultTags: string[], extraTags: string[]): string[] {
	return Array.from(new Set([...defaultTags, ...extraTags].filter(Boolean)));
}
