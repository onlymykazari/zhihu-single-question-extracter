import {requestUrl} from "obsidian";
import type {SourceAdapter} from "./base";
import type {ExtractContext, ExtractedContent} from "../types";
import {looksLikeCssNoise, normalizeHumanText, truncateText} from "../utils/sanitize";
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

interface ZhihuApiAnswer {
	content?: string;
	excerpt?: string;
	excerpt_new?: string;
	created_time?: number | string;
	updated_time?: number | string;
	type?: string;
	author?: {
		name?: string;
		url?: string;
	};
	question?: {
		id?: number | string;
		title?: string;
		detail?: string;
		excerpt?: string;
	};
}

interface ZhihuApiQuestion {
	title?: string;
	detail?: string;
	excerpt?: string;
}

interface ZhihuStateAuthor {
	name?: string;
	url?: string;
	url_token?: string;
	id?: string | number;
}

function cleanAuthorName(value?: string): string | undefined {
	if (!value) {
		return undefined;
	}
	const normalized = truncateText(normalizeHumanText(value), 64);
	if (!normalized || looksLikeCssNoise(normalized)) {
		return undefined;
	}
	return normalized;
}

function cleanQuestionTitle(value?: string): string {
	const normalized = truncateText(normalizeHumanText(value ?? ""), 120);
	return normalized || "Untitled";
}

function cleanQuestionDescription(value?: string): string | undefined {
	if (!value) {
		return undefined;
	}
	const cleaned = value
		.replace(/(显示全部|显示更多|阅读全文)[\s\u200b\u200c\u200d\ufeff\xa0]*$/g, "")
		.trim();
	return cleaned || undefined;
}

function isPlaceholderQuestionDescription(value?: string): boolean {
	if (!value) {
		return false;
	}
	const normalized = normalizeHumanText(value);
	return normalized === "[图片]" || normalized === "图片" || normalized === "[image]";
}

function looksTruncatedQuestionDescription(value?: string): boolean {
	if (!value) {
		return false;
	}
	const normalized = normalizeHumanText(value);
	return (
		normalized.endsWith("…") ||
		normalized.endsWith("...") ||
		normalized.includes("显示全部") ||
		normalized.includes("显示更多") ||
		normalized.includes("阅读全文")
	);
}

function textFromElement(root: ParentNode, selector: string): string | undefined {
	const element = root.querySelector(selector);
	return element?.textContent?.trim() || undefined;
}

function htmlFromElement(root: ParentNode, selector: string): string | undefined {
	const element = root.querySelector(selector);
	return element?.innerHTML?.trim() || undefined;
}

function hrefFromElement(root: ParentNode, selector: string): string | undefined {
	const element = root.querySelector(selector);
	const href = element?.getAttribute("href")?.trim();
	if (!href) {
		return undefined;
	}
	return href.startsWith("http") ? href : `https://www.zhihu.com${href}`;
}

function parseJsonLdAuthor(html: string): {authorName?: string; authorUrl?: string} | null {
	const scripts = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/ig);
	if (!scripts) {
		return null;
	}

	for (const script of scripts) {
		const raw = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
		if (!raw) {
			continue;
		}
		try {
			const data = JSON.parse(raw) as Record<string, unknown>;
			const author = data.author as Record<string, unknown> | undefined;
			const authorName = cleanAuthorName(typeof author?.name === "string" ? author.name : "");
			const authorUrl = normalizeAuthorUrl(typeof author?.url === "string" ? author.url : "");
			if (authorName || authorUrl) {
				return {authorName, authorUrl};
			}
		} catch {
			continue;
		}
	}

	return null;
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

function sanitizeCookie(rawCookie?: string): string | undefined {
	if (!rawCookie) {
		return undefined;
	}

	const withoutPrefix = rawCookie.replace(/^cookie\s*:\s*/i, "");
	const normalized = withoutPrefix
		.replace(/\r?\n+/g, " ")
		.split(";")
		.map((segment) => segment.trim())
		.filter(Boolean)
		.join("; ");

	return normalized || undefined;
}

function pickRecord<T extends Record<string, unknown>>(collection: unknown, key: string): T | null {
	if (!collection || typeof collection !== "object") {
		return null;
	}
	const typed = collection as Record<string, unknown>;
	const value = typed[key];
	return value && typeof value === "object" ? value as T : null;
}

function pickStateAuthor(entities: Record<string, unknown>, answer: Record<string, unknown>): ZhihuStateAuthor | null {
	const directAuthor = answer.author;
	if (directAuthor && typeof directAuthor === "object") {
		const typed = directAuthor as ZhihuStateAuthor;
		if (typed.name || typed.url || typed.url_token) {
			return typed;
		}
	}

	const directAuthorId = typeof directAuthor === "string" || typeof directAuthor === "number"
		? String(directAuthor)
		: typeof (directAuthor as {id?: string | number} | undefined)?.id !== "undefined"
			? String((directAuthor as {id?: string | number}).id)
			: "";

	if (!directAuthorId) {
		return null;
	}

	const authorCollections = ["users", "members", "people"];
	for (const key of authorCollections) {
		const collection = pickRecord<Record<string, unknown>>(entities, key);
		const authorRecord = collection ? pickRecord<Record<string, unknown>>(collection, directAuthorId) : null;
		const author = authorRecord as ZhihuStateAuthor | null;
		if (author?.name || author?.url || author?.url_token) {
			return author;
		}
	}

	return null;
}

function normalizeAuthorUrl(value?: string): string | undefined {
	if (!value) {
		return undefined;
	}
	if (value.startsWith("https://www.zhihu.com/api/v4/people/")) {
		return value.replace("/api/v4/people/", "/people/");
	}
	if (value.startsWith("http://www.zhihu.com/api/v4/people/")) {
		return value.replace("/api/v4/people/", "/people/").replace("http://", "https://");
	}
	if (value.startsWith("http")) {
		return value;
	}
	if (value.startsWith("/people/")) {
		return `https://www.zhihu.com${value}`;
	}
	return `https://www.zhihu.com/people/${value.replace(/^\/+/, "")}`;
}

function mergePayloads(primary: ZhihuPayload | null, secondary: ZhihuPayload | null): ZhihuPayload | null {
	if (!primary) {
		return secondary;
	}
	if (!secondary) {
		return primary;
	}

	return {
		questionTitle: primary.questionTitle || secondary.questionTitle,
		questionDescription: primary.questionDescription || secondary.questionDescription,
		answerHtml: primary.answerHtml || secondary.answerHtml,
		authorName: primary.authorName || secondary.authorName,
		authorUrl: primary.authorUrl || secondary.authorUrl,
		publishedAt: primary.publishedAt || secondary.publishedAt,
		updatedAt: primary.updatedAt || secondary.updatedAt
	};
}

function needsMetadataEnrichment(payload: ZhihuPayload | null): boolean {
	if (!payload) {
		return true;
	}
	return !payload.authorName || !payload.authorUrl || !payload.publishedAt || !payload.updatedAt;
}

function applyApiMetadata(base: ZhihuPayload | null, apiPayload: ZhihuPayload | null): ZhihuPayload | null {
	if (!base) {
		return apiPayload;
	}
	if (!apiPayload) {
		return base;
	}

	const questionDescription = isPlaceholderQuestionDescription(apiPayload.questionDescription)
		? base.questionDescription
		: apiPayload.questionDescription || base.questionDescription;

	return {
		questionTitle: base.questionTitle || apiPayload.questionTitle,
		questionDescription,
		answerHtml: base.answerHtml || apiPayload.answerHtml,
		authorName: apiPayload.authorName || base.authorName,
		authorUrl: apiPayload.authorUrl || base.authorUrl,
		publishedAt: apiPayload.publishedAt || base.publishedAt,
		updatedAt: apiPayload.updatedAt || base.updatedAt
	};
}

function applyQuestionMetadata(base: ZhihuPayload | null, questionPayload: Pick<ZhihuPayload, "questionTitle" | "questionDescription"> | null): ZhihuPayload | null {
	if (!base) {
		if (!questionPayload) {
			return null;
		}
		return {
			questionTitle: questionPayload.questionTitle,
			questionDescription: questionPayload.questionDescription,
			answerHtml: ""
		};
	}
	if (!questionPayload) {
		return base;
	}

	const preferQuestionDescription = Boolean(
		questionPayload.questionDescription &&
		(
			!base.questionDescription ||
			isPlaceholderQuestionDescription(base.questionDescription) ||
			looksTruncatedQuestionDescription(base.questionDescription) ||
			questionPayload.questionDescription.length > base.questionDescription.length
		)
	);

	return {
		...base,
		questionTitle: questionPayload.questionTitle || base.questionTitle,
		questionDescription: preferQuestionDescription ? questionPayload.questionDescription : base.questionDescription
	};
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
	const author = pickStateAuthor(entities, answer);

	return {
		questionTitle: cleanQuestionTitle(String(question?.title ?? answerQuestion?.title ?? "")),
		questionDescription: cleanQuestionDescription(String(question?.detail ?? question?.excerpt ?? "")),
		answerHtml: String(answer.content ?? answer.excerpt_new ?? ""),
		authorName: cleanAuthorName(String(author?.name ?? "")),
		authorUrl: normalizeAuthorUrl(author?.url ?? author?.url_token),
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

function buildHeaders(cookie: string | undefined, userAgent: string): Record<string, string> {
	const headers: Record<string, string> = {
		"User-Agent": userAgent,
		Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
		"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
		"Cache-Control": "no-cache",
		Pragma: "no-cache",
		Referer: "https://www.zhihu.com/",
		"Upgrade-Insecure-Requests": "1"
	};

	if (cookie) {
		headers.Cookie = cookie;
	}

	return headers;
}

async function fetchText(url: string, headers: Record<string, string>, timeoutMs: number): Promise<string> {
	const response = await withTimeout(requestUrl({
		url,
		method: "GET",
		headers,
		throw: false
	}), timeoutMs);

	if (response.status >= 400) {
		throw new Error(`HTTP_${response.status}`);
	}

	return response.text;
}

async function fetchJson<T>(url: string, headers: Record<string, string>, timeoutMs: number): Promise<T> {
	const response = await withTimeout(requestUrl({
		url,
		method: "GET",
		headers: {
			...headers,
			Accept: "application/json,text/plain,*/*"
		},
		throw: false
	}), timeoutMs);

	if (response.status >= 400) {
		throw new Error(`HTTP_${response.status}`);
	}

	return response.json as T;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timeoutId = window.setTimeout(() => {
			reject(new Error(`HTTP_TIMEOUT_${timeoutMs}`));
		}, timeoutMs);

		promise.then((value) => {
			window.clearTimeout(timeoutId);
			resolve(value);
		}).catch((error) => {
			window.clearTimeout(timeoutId);
			reject(error);
		});
	});
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
	let lastImageUrl: string | null = null;

	function renderNode(node: Node): string {
		if (node.nodeType === Node.TEXT_NODE) {
			return node.textContent ?? "";
		}
		if (!(node instanceof HTMLElement)) {
			return "";
		}
		const tag = node.tagName.toLowerCase();
		switch (tag) {
			case "style":
			case "script":
			case "noscript":
			case "svg":
			case "path":
			case "defs":
			case "symbol":
				return "";
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
				if (lastImageUrl === imageUrl) {
					return "";
				}
				lastImageUrl = imageUrl;
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

	const markdown = root ? postProcessMarkdown(renderChildren(root)) : "";
	return {markdown, images: Array.from(new Set(images))};
}

function postProcessMarkdown(markdown: string): string {
	const lines = markdown.split("\n");
	const filtered: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim().replace(/(显示全部|显示更多|阅读全文)[\s\u200b\u200c\u200d\ufeff\xa0]*$/g, "").trim();
		if (!trimmed) {
			filtered.push("");
			continue;
		}
		if (looksLikeCssNoise(trimmed) && !trimmed.startsWith("![")) {
			continue;
		}
		filtered.push(trimmed === line.trim() ? line : line.replace(/(显示全部|显示更多|阅读全文)[\s\u200b\u200c\u200d\ufeff\xa0]*$/g, "").replace(/\s+$/g, ""));
	}

	return filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function fromDom(html: string): ZhihuPayload | null {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const questionTitle = textFromElement(doc, "h1.QuestionHeader-title, h1.Post-Title");
	const questionDescription = htmlFromElement(doc, ".QuestionRichText, .QuestionHeader-detail");
	const answerHtml = htmlFromElement(doc, ".RichContent .RichText, .AnswerCard .RichContent-inner, .Post-RichText");
	const authorName = textFromElement(
		doc,
		".AuthorInfo-name, .UserLink-link, .AuthorInfo-content a[href^='/people/'], .AnswerItem-authorInfo a[href^='/people/']"
	);
	const authorUrl = hrefFromElement(
		doc,
		".AuthorInfo-content a[href^='/people/'], .AuthorInfo a[href^='/people/'], .AnswerItem-authorInfo a[href^='/people/']"
	);
	const publishedAt = doc.querySelector("meta[itemprop='dateCreated']")?.getAttribute("content") ?? undefined;
	const updatedAt = doc.querySelector("meta[itemprop='dateModified']")?.getAttribute("content") ?? undefined;

	if (!questionTitle || !answerHtml) {
		return null;
	}

	return {
		questionTitle,
		questionDescription: cleanQuestionDescription(questionDescription),
		answerHtml,
		authorName: cleanAuthorName(authorName),
		authorUrl,
		publishedAt,
		updatedAt
	};
}

function fromAnswerApi(answer: ZhihuApiAnswer): ZhihuPayload | null {
	const answerHtml = String(answer.content ?? answer.excerpt_new ?? answer.excerpt ?? "");
	const questionTitle = cleanQuestionTitle(String(answer.question?.title ?? ""));
	if (!questionTitle || !answerHtml) {
		return null;
	}

	return {
		questionTitle,
		questionDescription: cleanQuestionDescription(String(answer.question?.detail ?? answer.question?.excerpt ?? "")),
		answerHtml,
		authorName: cleanAuthorName(answer.author?.name),
		authorUrl: normalizeAuthorUrl(answer.author?.url),
		publishedAt: toIso(answer.created_time),
		updatedAt: toIso(answer.updated_time)
	};
}

function fromQuestionApi(question: ZhihuApiQuestion): Pick<ZhihuPayload, "questionTitle" | "questionDescription"> | null {
	const questionTitle = cleanQuestionTitle(String(question.title ?? ""));
	const questionDescription = cleanQuestionDescription(String(question.detail ?? question.excerpt ?? ""));
	if (!questionTitle && !questionDescription) {
		return null;
	}

	return {
		questionTitle,
		questionDescription
	};
}

function toUserFacingError(error: unknown, hasCookie: boolean): Error {
	const message = error instanceof Error ? error.message : String(error);
	if (message === "HTTP_403") {
		return new Error(
			hasCookie
				? "Zhihu returned 403 even with Cookie. The Cookie may be incomplete or expired, or Zhihu blocked this request path."
				: "Zhihu returned 403. Anonymous requests are blocked; try enabling Cookie in advanced settings."
		);
	}

	if (message.includes("ERR_SOCKET_NOT_CONNECTED")) {
		return new Error("Network socket failed while sending the request. This is often caused by a malformed Cookie header or a blocked connection.");
	}

	if (message.startsWith("HTTP_TIMEOUT_")) {
		return new Error("Zhihu request timed out. The site may be throttling this request or the connection is unstable.");
	}

	return error instanceof Error ? error : new Error(message);
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

		const cookie = sanitizeCookie(context.cookie);
		const headers = buildHeaders(cookie, context.userAgent);
		let payload: ZhihuPayload | null = null;
		const apiUrl = `https://www.zhihu.com/api/v4/answers/${match.answerId}?include=content,excerpt,excerpt_new,created_time,updated_time,author.name,author.url,question.title,question.excerpt,question.detail`;
		const questionApiUrl = `https://www.zhihu.com/api/v4/questions/${match.questionId}?include=title,detail,excerpt`;

		try {
			const html = await fetchText(url, headers, context.timeoutMs);
			const state = parseInitialState(html);
			const jsonLdAuthor = parseJsonLdAuthor(html);
			payload = mergePayloads(fromState(state, match.answerId), fromDom(html));
			if (jsonLdAuthor) {
				payload = mergePayloads(payload, {
					questionTitle: "",
					answerHtml: "",
					authorName: jsonLdAuthor.authorName,
					authorUrl: jsonLdAuthor.authorUrl
				});
			}
			if (needsMetadataEnrichment(payload)) {
				try {
					const apiAnswer = await fetchJson<ZhihuApiAnswer>(apiUrl, headers, context.timeoutMs);
					payload = applyApiMetadata(payload, fromAnswerApi(apiAnswer));
				} catch {
					// Keep the HTML-derived payload when the API enrichment path is blocked.
				}
			}
			if (!payload?.questionDescription || isPlaceholderQuestionDescription(payload.questionDescription) || looksTruncatedQuestionDescription(payload.questionDescription)) {
				try {
					const apiQuestion = await fetchJson<ZhihuApiQuestion>(questionApiUrl, headers, context.timeoutMs);
					payload = applyQuestionMetadata(payload, fromQuestionApi(apiQuestion));
				} catch {
					// Keep the existing question description when the question API path is blocked.
				}
			}
		} catch (error) {
			if (!(error instanceof Error) || error.message !== "HTTP_403") {
				try {
					const apiAnswer = await fetchJson<ZhihuApiAnswer>(apiUrl, headers, context.timeoutMs);
					payload = fromAnswerApi(apiAnswer);
					try {
						const apiQuestion = await fetchJson<ZhihuApiQuestion>(questionApiUrl, headers, context.timeoutMs);
						payload = applyQuestionMetadata(payload, fromQuestionApi(apiQuestion));
					} catch {
						// Keep answer-only payload when question enrichment is blocked.
					}
				} catch (apiError) {
					throw toUserFacingError(apiError, Boolean(cookie));
				}
			} else {
				try {
					const apiAnswer = await fetchJson<ZhihuApiAnswer>(apiUrl, headers, context.timeoutMs);
					payload = fromAnswerApi(apiAnswer);
					try {
						const apiQuestion = await fetchJson<ZhihuApiQuestion>(questionApiUrl, headers, context.timeoutMs);
						payload = applyQuestionMetadata(payload, fromQuestionApi(apiQuestion));
					} catch {
						// Keep answer-only payload when question enrichment is blocked.
					}
				} catch (apiError) {
					throw toUserFacingError(apiError, Boolean(cookie));
				}
			}
		}

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
