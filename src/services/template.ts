import type {ExtractedContent} from "../types";
import {formatDate} from "../utils/date";
import {looksLikeCssNoise, normalizeHumanText, sanitizeFilenamePart, truncateText} from "../utils/sanitize";

function normalizeFilenameValue(value: string, fallback: string, maxLength: number): string {
	const normalized = truncateText(sanitizeFilenamePart(normalizeHumanText(value)), maxLength);
	if (!normalized || looksLikeCssNoise(normalized)) {
		return fallback;
	}
	return normalized;
}

export function applyFilenameTemplate(template: string, content: ExtractedContent, importedAt: Date, dateFormat: string): string {
	const publishedDate = content.publishedAt ? new Date(content.publishedAt) : importedAt;
	const replacements: Record<string, string> = {
		"{{title}}": normalizeFilenameValue(content.title, "Untitled", 80),
		"{{author}}": normalizeFilenameValue(content.authorName ?? "", "Unknown", 32),
		"{{import_date}}": formatDate(importedAt, dateFormat),
		"{{answer_date}}": formatDate(publishedDate, dateFormat),
		"{{question_id}}": content.metadata.zhihu_question_id ?? "",
		"{{answer_id}}": content.metadata.zhihu_answer_id ?? ""
	};

	let output = template;
	for (const key in replacements) {
		if (Object.prototype.hasOwnProperty.call(replacements, key)) {
			output = output.split(key).join(sanitizeFilenamePart(replacements[key] ?? ""));
		}
	}

	const cleaned = truncateText(sanitizeFilenamePart(output), 120);
	return cleaned || "Imported Note";
}
