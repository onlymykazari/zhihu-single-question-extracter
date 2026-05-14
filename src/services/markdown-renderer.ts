import {getText} from "../i18n";
import type {ExtractedContent, RenderContext, ResolvedLocale} from "../types";
import {formatDate} from "../utils/date";

function toFrontmatterLines(content: ExtractedContent, context: RenderContext): string[] {
	const lines = [
		"---",
		`title: ${escapeYamlValue(content.title)}`,
		`source: ${content.sourceUrl}`,
		`author: ${escapeYamlValue(content.authorName ?? "")}`,
		`author_url: ${content.authorUrl ?? ""}`,
		`answer_time: ${content.publishedAt ?? ""}`,
		`updated_at: ${content.updatedAt ?? ""}`,
		`imported_at: ${formatDate(context.importedAt, context.dateFormat)}`,
		`zhihu_question_id: "${content.metadata.zhihu_question_id ?? ""}"`,
		`zhihu_answer_id: "${content.metadata.zhihu_answer_id ?? ""}"`,
		"tags:"
	];

	for (const tag of context.tags) {
		lines.push(`  - ${tag}`);
	}

	lines.push("---");
	return lines;
}

function escapeYamlValue(value: string): string {
	return JSON.stringify(value ?? "");
}

function getSection(content: ExtractedContent, type: string): string | undefined {
	return content.sections.find((section) => section.type === type)?.markdown.trim();
}

function renderQuestionBlock(title: string, questionText: string, locale: ResolvedLocale, optimizeForObsidian: boolean): string[] {
	const text = getText(locale);
	if (optimizeForObsidian) {
		return [
			`> [!question] ${text.calloutQuestion}`,
			...questionText.split("\n").map((line) => `> ${line}`)
		];
	}
	return [`## ${text.labelQuestion}`, "", questionText];
}

function renderBackgroundBlock(backgroundText: string, locale: ResolvedLocale, optimizeForObsidian: boolean): string[] {
	const text = getText(locale);
	if (!backgroundText) {
		return [];
	}
	if (optimizeForObsidian) {
		return [
			"",
			`> [!info] ${text.calloutBackground}`,
			...backgroundText.split("\n").map((line) => `> ${line}`)
		];
	}
	return ["", `## ${text.labelBackground}`, "", backgroundText];
}

function renderAnswerMetaBlock(content: ExtractedContent, locale: ResolvedLocale, optimizeForObsidian: boolean): string[] {
	const text = getText(locale);
	const metaLines = [
		`${text.labelAuthor}: ${content.authorName ?? ""}`,
		`${text.labelPublishedAt}: ${content.publishedAt ?? ""}`,
		`${text.labelUpdatedAt}: ${content.updatedAt ?? ""}`,
		`${text.labelSource}: [${content.sourceUrl}](${content.sourceUrl})`
	].filter((line) => !line.endsWith(": "));

	if (optimizeForObsidian) {
		return [
			"",
			`> [!note] ${text.calloutAnswerMeta}`,
			...metaLines.map((line) => `> ${line}`)
		];
	}

	return ["", "## Metadata", "", ...metaLines];
}

export function renderMarkdown(content: ExtractedContent, context: RenderContext): string {
	const locale = context.locale;
	const text = getText(locale);
	const questionText = getSection(content, "question") ?? content.title;
	const backgroundText = getSection(content, "background") ?? "";
	const answerText = getSection(content, "answer") ?? "";

	const bodyLines = [
		...toFrontmatterLines(content, context),
		"",
		`# ${content.title}`,
		"",
		...renderQuestionBlock(content.title, questionText, locale, context.optimizeForObsidian),
		...renderBackgroundBlock(backgroundText, locale, context.optimizeForObsidian),
		...renderAnswerMetaBlock(content, locale, context.optimizeForObsidian),
		"",
		`## ${text.labelAnswer}`,
		"",
		answerText
	];

	return bodyLines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s+$/, "") + "\n";
}
