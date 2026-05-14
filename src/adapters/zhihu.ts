import {requestUrl} from "obsidian";
import type {SourceAdapter} from "./base";
import type {ExtractContext, ExtractedContent} from "../types";
import {parseZhihuAnswerUrl} from "../utils/url";

interface ZhihuPayload {
	questionTitle: string;
	questionDescription?: string;
	answerHtml: string;
	authorName?: string;
	authorUrl?: string;
	publishedAt?: string;
	updatedAt?: string;
}

function textFromElement(root: ParentNode, selector: string): string | undefined {
	const element = root.querySelector(selector);
	return element?.textContent?.trim() || undefined;
}

function htmlFromElement(root: ParentNode, selector: string): string | undefined {
	const element = root.querySelector(selector);
	return element?.innerHTML?.trim() || undefined;
}

function parseInitialState(html: string): unknown | null {
	const patterns = [
		/<script id="js-initialData" type="text\/json">([\s\S]*?)<\/script>/i,
		/<script[^>]*>window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i,
		/<script[^>]*>window\.__INITIAL_DATA__\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i
	];

	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (!match?.[1]) {
			continue;
		}
		try {
			return JSON.parse(match[1]);
		} catch {
			continue;
		}
	}

	return null;
}

function pickRecord<T extends Record<string, unknown>>(collection: unknown, key: string): T | null {
	if (!collection || typeof collection !== "object") {
		return null;
	}
	const typed = collection as Record<string, unknown>;
	const value = typed[key];
	return value && typeof value === "object" ? value as T : null;
}

function fromState(state: unknown, answerId: string): ZhihuPayload | null {
	if (!state || typeof state !== "object") {
		return null;
	}
	const root = state as Record<string, unknown>;
	const entities = pickRecord<Record<string, unknown>>(root, "entities") ?? root;
	const questions = pickRecord<Record<string, unknown>>(entities, "questions");
	const answers = pickRecord<Record<string, unknown>>(entities, "answers");
	const answer = answers ? pickRecord<Record<string, unknown>>(answers, answerId) : null;

	if (!answer) {
		return null;
	}

	const answerQuestion = answer.question as Record<string, unknown> | undefined;
	const questionId = String(answerQuestion?.id ?? "");
	const question = questions ? pickRecord<Record<string, unknown>>(questions, questionId) : null;
	const author = answer.author as Record<string, unknown> | undefined;

	return {
		questionTitle: String(question?.title ?? answerQuestion?.title ?? ""),
		questionDescription: String(question?.excerpt ?? question?.detail ?? ""),
		answerHtml: String(answer.content ?? answer.excerpt_new ?? ""),
		authorName: String(author?.name ?? ""),
		authorUrl: author?.url ? `https://www.zhihu.com${String(author.url)}` : undefined,
		publishedAt: toIso(answer.created_time),
		updatedAt: toIso(answer.updated_time)
	};
}

function toIso(value: unknown): string | undefined {
	if (typeof value === "number") {
		return new Date(value * 1000).toISOString();
	}
	if (typeof value === "string" && value) {
		const asNumber = Number(value);
		if (!Number.isNaN(asNumber) && value.length >= 10) {
			return new Date(asNumber * 1000).toISOString();
		}
		return value;
	}
	return undefined;
}

function imageUrlFromElement(element: Element): string | null {
	const candidates = [
		element.getAttribute("data-original"),
		element.getAttribute("data-actualsrc"),
		element.getAttribute("data-src"),
		element.getAttribute("src")
	];
	for (const candidate of candidates) {
		if (candidate) {
			return candidate;
		}
	}
	return null;
}

function htmlToMarkdown(html: string): {markdown: string; images: string[]} {
	const parser = new DOMParser();
	const doc = parser.parseFromString(`<div id="root">${html}</div>`, "text/html");
	const root = doc.getElementById("root");
	const images: string[] = [];

	function renderNode(node: Node): string {
		if (node.nodeType === Node.TEXT_NODE) {
			return node.textContent ?? "";
		}
		if (!(node instanceof HTMLElement)) {
			return "";
		}
		const tag = node.tagName.toLowerCase();
		switch (tag) {
			case "p":
				return `${renderChildren(node).trim()}\n\n`;
			case "br":
				return "  \n";
			case "strong":
			case "b":
				return `**${renderChildren(node).trim()}**`;
			case "em":
			case "i":
				return `*${renderChildren(node).trim()}*`;
			case "blockquote": {
				const block = renderChildren(node).trim();
				return `${block.split("\n").map((line) => `> ${line}`).join("\n")}\n\n`;
			}
			case "pre":
				return `\`\`\`\n${node.textContent?.trim() ?? ""}\n\`\`\`\n\n`;
			case "code":
				return `\`${node.textContent?.trim() ?? ""}\``;
			case "ul":
				return `${Array.from(node.children).map((child) => `- ${renderChildren(child).trim()}`).join("\n")}\n\n`;
			case "ol":
				return `${Array.from(node.children).map((child, index) => `${index + 1}. ${renderChildren(child).trim()}`).join("\n")}\n\n`;
			case "li":
				return `${renderChildren(node).trim()}\n`;
			case "a": {
				const href = node.getAttribute("href") ?? "";
				const url = href.startsWith("http") ? href : `https://www.zhihu.com${href}`;
				return `[${renderChildren(node).trim() || url}](${url})`;
			}
			case "img": {
				const imageUrl = imageUrlFromElement(node);
				if (!imageUrl) {
					return "";
				}
				images.push(imageUrl);
				const alt = node.getAttribute("alt") ?? "";
				return `![${alt}](${imageUrl})\n\n`;
			}
			case "h1":
			case "h2":
			case "h3":
			case "h4":
			case "h5":
			case "h6": {
				const depth = Number(tag.slice(1));
				return `${"#".repeat(depth)} ${renderChildren(node).trim()}\n\n`;
			}
			default:
				return renderChildren(node);
		}
	}

	function renderChildren(node: ParentNode): string {
		return Array.from(node.childNodes).map(renderNode).join("");
	}

	const markdown = root ? renderChildren(root).replace(/\n{3,}/g, "\n\n").trim() : "";
	return {markdown, images: Array.from(new Set(images))};
}

function fromDom(html: string): ZhihuPayload | null {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const questionTitle = textFromElement(doc, "h1.QuestionHeader-title, h1.Post-Title");
	const questionDescription = htmlFromElement(doc, ".QuestionRichText, .QuestionHeader-detail");
	const answerHtml = htmlFromElement(doc, ".RichContent .RichText, .AnswerCard .RichContent-inner, .Post-RichText");
	const authorName = textFromElement(doc, ".AuthorInfo-name, .UserLink-link");
	const publishedAt = doc.querySelector("meta[itemprop='dateCreated']")?.getAttribute("content") ?? undefined;
	const updatedAt = doc.querySelector("meta[itemprop='dateModified']")?.getAttribute("content") ?? undefined;

	if (!questionTitle || !answerHtml) {
		return null;
	}

	return {
		questionTitle,
		questionDescription,
		answerHtml,
		authorName,
		publishedAt,
		updatedAt
	};
}

export class ZhihuAdapter implements SourceAdapter {
	readonly sourceType = "zhihu" as const;

	canHandle(url: string): boolean {
		return parseZhihuAnswerUrl(url) !== null;
	}

	async extract(url: string, context: ExtractContext): Promise<ExtractedContent> {
		const match = parseZhihuAnswerUrl(url);
		if (!match) {
			throw new Error("Invalid Zhihu answer URL");
		}

		const headers: Record<string, string> = {
			"User-Agent": "Mozilla/5.0",
			Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
			Referer: "https://www.zhihu.com/"
		};
		if (context.cookie) {
			headers.Cookie = context.cookie;
		}

		const response = await requestUrl({
			url,
			method: "GET",
			headers,
			throw: false
		});

		if (response.status >= 400) {
			throw new Error(`Zhihu request failed with status ${response.status}`);
		}

		const html = response.text;
		const state = parseInitialState(html);
		const payload = fromState(state, match.answerId) ?? fromDom(html);
		if (!payload?.questionTitle || !payload.answerHtml) {
			throw new Error("Unable to extract Zhihu answer content");
		}

		const answerRendered = htmlToMarkdown(payload.answerHtml);
		const backgroundMarkdown = payload.questionDescription
			? htmlToMarkdown(payload.questionDescription).markdown
			: "";

		return {
			sourceType: "zhihu",
			sourceUrl: url,
			title: payload.questionTitle,
			description: backgroundMarkdown,
			authorName: payload.authorName,
			authorUrl: payload.authorUrl,
			publishedAt: payload.publishedAt,
			updatedAt: payload.updatedAt,
			tags: ["zhihu"],
			sections: [
				{type: "question", title: "Question", markdown: payload.questionTitle},
				...(backgroundMarkdown ? [{type: "background" as const, title: "Background", markdown: backgroundMarkdown}] : []),
				{type: "answer", title: "Answer", markdown: answerRendered.markdown}
			],
			attachments: answerRendered.images.map((originalUrl) => ({originalUrl})),
			metadata: {
				zhihu_question_id: match.questionId,
				zhihu_answer_id: match.answerId
			}
		};
	}
}
