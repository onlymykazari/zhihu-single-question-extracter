import type {ExtractedContent} from "../types";
import {formatDate} from "../utils/date";
import {sanitizeFilenamePart} from "../utils/sanitize";

export function applyFilenameTemplate(template: string, content: ExtractedContent, importedAt: Date, dateFormat: string): string {
	const publishedDate = content.publishedAt ? new Date(content.publishedAt) : importedAt;
	const replacements: Record<string, string> = {
		"{{title}}": content.title,
		"{{author}}": content.authorName ?? "Unknown",
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

	const cleaned = sanitizeFilenamePart(output);
	return cleaned || "Imported Note";
}
