import {requestUrl, RequestUrlResponse} from "obsidian";
import QRCode from "qrcode";

const QR_LOGIN_URL = "https://www.zhihu.com/api/v3/account/api/login/qrcode";
const UDID_URL = "https://www.zhihu.com/udid";

export interface ZhihuQrLoginSession {
	token: string;
	link: string;
	qrCodeDataUrl: string;
	cookie: string;
}

export interface ZhihuQrPollResult {
	status: "waiting" | "scanned" | "success" | "expired" | "canceled";
	message?: string;
	cookie?: string;
}

interface QrCreateResponse {
	token?: string;
	link?: string;
	url?: string;
	qrcode_url?: string;
}

interface QrScanResponse {
	status?: string | number;
	state?: string;
	message?: string;
	errmsg?: string;
	scanned?: boolean;
	confirmed?: boolean;
}

function unwrapResponse<T>(value: T | {data?: T}): T {
	if (value && typeof value === "object" && "data" in value && (value as {data?: T}).data) {
		return (value as {data: T}).data;
	}
	return value as T;
}

function headerValues(value: unknown): string[] {
	if (!value) {
		return [];
	}
	if (Array.isArray(value)) {
		return value.flatMap((item) => headerValues(item));
	}
	if (typeof value === "string") {
		return [value];
	}
	return [String(value)];
}

function cookiePairsFromSetCookie(value: unknown): string[] {
	return headerValues(value)
		.flatMap((header) => header.split(/,(?=\s*[^;,=\s]+=[^;,]+)/g))
		.map((part) => part.split(";")[0]?.trim() ?? "")
		.filter(Boolean);
}

function collectCookie(response: RequestUrlResponse, existingCookie: string | undefined): string {
	const setCookie = response.headers["set-cookie"] ?? response.headers["Set-Cookie"];
	if (!setCookie) {
		return existingCookie ?? "";
	}

	const jar = new Map<string, string>();
	for (const pair of headerValues(existingCookie).join(";").split(";").map((part) => part.trim()).filter(Boolean)) {
		const [name] = pair.split("=");
		if (name) {
			jar.set(name, pair);
		}
	}

	for (const pair of cookiePairsFromSetCookie(setCookie)) {
		const [name] = pair.split("=");
		if (name) {
			jar.set(name, pair);
		}
	}

	return Array.from(jar.values()).join("; ");
}

function buildHeaders(userAgent: string, cookie?: string): Record<string, string> {
	const headers: Record<string, string> = {
		"User-Agent": userAgent,
		Accept: "application/json,text/plain,*/*",
		"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
		"Cache-Control": "no-cache",
		Pragma: "no-cache",
		Referer: "https://www.zhihu.com/signin"
	};
	if (cookie) {
		headers.Cookie = cookie;
	}
	return headers;
}

async function requestJson<T>(
	url: string,
	method: "GET" | "POST",
	userAgent: string,
	cookie: string,
	timeoutMs: number
): Promise<{json: T; cookie: string}> {
	const response = await withTimeout(requestUrl({
		url,
		method,
		headers: buildHeaders(userAgent, cookie),
		throw: false
	}), timeoutMs);

	const nextCookie = collectCookie(response, cookie);
	if (response.status >= 400) {
		throw new Error(`Zhihu QR login request failed with status ${response.status}`);
	}

	return {json: response.json as T, cookie: nextCookie};
}

async function requestSeedCookie(userAgent: string, timeoutMs: number): Promise<string> {
	try {
		const response = await withTimeout(requestUrl({
			url: UDID_URL,
			method: "GET",
			headers: buildHeaders(userAgent),
			throw: false
		}), timeoutMs);
		return collectCookie(response, "");
	} catch {
		return "";
	}
}

function extractQrPayload(response: QrCreateResponse): {token: string; link: string} {
	const unwrapped = unwrapResponse<QrCreateResponse>(response);
	const token = unwrapped.token;
	const link = unwrapped.link ?? unwrapped.url ?? unwrapped.qrcode_url;
	if (!token || !link) {
		throw new Error("Zhihu QR login did not return token/link.");
	}
	return {token, link};
}

function normalizeScanStatus(response: QrScanResponse, cookie: string): ZhihuQrPollResult {
	const unwrapped = unwrapResponse<QrScanResponse>(response);
	const rawStatus = String(unwrapped.status ?? unwrapped.state ?? "").toLowerCase();
	const message = unwrapped.message ?? unwrapped.errmsg;

	if (cookie.includes("z_c0=")) {
		return {status: "success", message, cookie};
	}
	if (unwrapped.confirmed || ["success", "confirmed", "login_success", "3"].includes(rawStatus)) {
		return {status: "success", message, cookie};
	}
	if (unwrapped.scanned || ["scanned", "confirming", "1", "2"].includes(rawStatus)) {
		return {status: "scanned", message};
	}
	if (["expired", "timeout", "-1"].includes(rawStatus)) {
		return {status: "expired", message};
	}
	if (["canceled", "cancelled", "4"].includes(rawStatus)) {
		return {status: "canceled", message};
	}
	return {status: "waiting", message};
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timeoutId = window.setTimeout(() => {
			reject(new Error(`Zhihu QR login timed out after ${timeoutMs}ms.`));
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

export async function createZhihuQrLoginSession(userAgent: string, timeoutMs: number): Promise<ZhihuQrLoginSession> {
	let cookie = await requestSeedCookie(userAgent, timeoutMs);
	let createResult: {json: QrCreateResponse; cookie: string};

	try {
		createResult = await requestJson<QrCreateResponse>(QR_LOGIN_URL, "POST", userAgent, cookie, timeoutMs);
	} catch {
		createResult = await requestJson<QrCreateResponse>(QR_LOGIN_URL, "GET", userAgent, cookie, timeoutMs);
	}

	cookie = createResult.cookie;
	const {token, link} = extractQrPayload(createResult.json);
	const qrCodeDataUrl = await QRCode.toDataURL(link, {
		errorCorrectionLevel: "M",
		margin: 1,
		width: 240
	});

	return {token, link, qrCodeDataUrl, cookie};
}

export async function pollZhihuQrLogin(
	session: ZhihuQrLoginSession,
	userAgent: string,
	timeoutMs: number
): Promise<ZhihuQrPollResult> {
	const scanUrl = `${QR_LOGIN_URL}/${encodeURIComponent(session.token)}/scan_info`;
	const {json, cookie} = await requestJson<QrScanResponse>(scanUrl, "GET", userAgent, session.cookie, timeoutMs);
	session.cookie = cookie;
	return normalizeScanStatus(json, cookie);
}
