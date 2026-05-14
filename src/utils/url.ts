import {ZHIHU_URL_PATTERN} from "../constants";

export interface ZhihuUrlMatch {
	questionId: string;
	answerId: string;
}

export function parseZhihuAnswerUrl(url: string): ZhihuUrlMatch | null {
	const trimmed = url.trim();
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
