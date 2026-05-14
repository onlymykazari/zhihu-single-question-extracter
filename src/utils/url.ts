import {ZHIHU_URL_EXTRACT_PATTERN, ZHIHU_URL_PATTERN} from "../constants";

export interface ZhihuUrlMatch {
	questionId: string;
	answerId: string;
}

export function parseZhihuAnswerUrl(url: string): ZhihuUrlMatch | null {
	const trimmed = extractZhihuAnswerUrl(url) ?? url.trim();
	const match = trimmed.match(ZHIHU_URL_PATTERN);
	if (!match) {
		return null;
	}
	const [, questionId, answerId] = match;
	if (!questionId || !answerId) {
		return null;
	}
	return {questionId, answerId};
}

export function extractZhihuAnswerUrl(text: string): string | null {
	const match = text.match(ZHIHU_URL_EXTRACT_PATTERN);
	return match?.[0] ?? null;
}
