export type Locale = "auto" | "zh-CN" | "en";

export interface PluginSettings {
	importFolder: string;
	assetFolder: string;
	defaultTags: string[];
	filenameTemplate: string;
	dateFormat: string;
	locale: Locale;
	enableCookie: boolean;
	cookie: string;
	requestTimeoutMs: number;
	openAfterImport: boolean;
	optimizeForObsidian: boolean;
}

export interface ExtractContext {
	cookie?: string;
	timeoutMs: number;
	cacheImages: boolean;
	assetFolder: string;
	optimizeForObsidian: boolean;
}

export interface RemoteImage {
	originalUrl: string;
	filename?: string;
	localPath?: string;
}

export interface ContentSection {
	type: "question" | "background" | "answer" | "other";
	title?: string;
	markdown: string;
}

export interface ExtractedContent {
	sourceType: "zhihu" | "reddit" | "stackoverflow" | "quora";
	sourceUrl: string;
	title: string;
	description?: string;
	authorName?: string;
	authorUrl?: string;
	publishedAt?: string;
	updatedAt?: string;
	tags?: string[];
	sections: ContentSection[];
	attachments: RemoteImage[];
	metadata: Record<string, string>;
}

export interface ImportInput {
	url: string;
	tags: string[];
	cacheImages: boolean;
}

export interface RenderContext {
	optimizeForObsidian: boolean;
	locale: ResolvedLocale;
	importedAt: Date;
	dateFormat: string;
	sourceUrl: string;
	tags: string[];
}

export interface ImportResult {
	filePath: string;
	title: string;
}

export type ResolvedLocale = "zh-CN" | "en";
