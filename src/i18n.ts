import type {Locale, ResolvedLocale} from "./types";

interface TextBundle {
	ribbonLabel: string;
	commandName: string;
	settingsTitle: string;
	settingImportFolderName: string;
	settingImportFolderDesc: string;
	settingAssetFolderName: string;
	settingAssetFolderDesc: string;
	settingDefaultTagsName: string;
	settingDefaultTagsDesc: string;
	settingTemplateName: string;
	settingTemplateDesc: string;
	settingDateFormatName: string;
	settingDateFormatDesc: string;
	settingLanguageName: string;
	settingLanguageDesc: string;
	settingOpenFileName: string;
	settingOpenFileDesc: string;
	settingObsidianName: string;
	settingObsidianDesc: string;
	settingAdvancedTitle: string;
	settingCookieEnabledName: string;
	settingCookieEnabledDesc: string;
	settingCookieName: string;
	settingCookieDesc: string;
	settingQrLoginName: string;
	settingQrLoginDesc: string;
	settingQrLoginButton: string;
	settingUserAgentName: string;
	settingUserAgentDesc: string;
	settingTimeoutName: string;
	settingTimeoutDesc: string;
	modalTitle: string;
	modalUrlName: string;
	modalUrlDesc: string;
	modalTagsName: string;
	modalTagsDesc: string;
	modalCacheImagesName: string;
	modalCacheImagesDesc: string;
	modalSubmit: string;
	modalCancel: string;
	qrLoginTitle: string;
	qrLoginPreparing: string;
	qrLoginWaiting: string;
	qrLoginScanned: string;
	qrLoginBlocked: string;
	qrLoginSuccess: string;
	qrLoginExpired: string;
	qrLoginCanceled: string;
	qrLoginFailed: string;
	noticeImporting: string;
	noticeSuccess: string;
	noticeFailure: string;
	noticeInvalidUrl: string;
	noticeNeedCookie: string;
	calloutQuestion: string;
	calloutBackground: string;
	calloutAnswerMeta: string;
	labelAuthor: string;
	labelPublishedAt: string;
	labelUpdatedAt: string;
	labelSource: string;
	labelAnswer: string;
	labelQuestion: string;
	labelBackground: string;
}

const BUNDLES: Record<ResolvedLocale, TextBundle> = {
	"zh-CN": {
		ribbonLabel: "导入知乎回答",
		commandName: "导入知乎回答",
		settingsTitle: "知乎导入设置",
		settingImportFolderName: "导入目录",
		settingImportFolderDesc: "Markdown 笔记保存到的 vault 目录。",
		settingAssetFolderName: "图片目录",
		settingAssetFolderDesc: "缓存图片时使用的公共资源目录。",
		settingDefaultTagsName: "默认标签",
		settingDefaultTagsDesc: "使用逗号分隔，导入时会与弹窗输入标签合并。",
		settingTemplateName: "文件名模板",
		settingTemplateDesc: "支持 {{title}}、{{author}}、{{import_date}}、{{answer_date}}、{{question_id}}、{{answer_id}}。",
		settingDateFormatName: "日期格式",
		settingDateFormatDesc: "用于文件名模板和 imported_at 字段。",
		settingLanguageName: "语言",
		settingLanguageDesc: "auto 表示优先跟随 Obsidian，失败则回退中文。",
		settingOpenFileName: "导入后打开文件",
		settingOpenFileDesc: "导入完成后自动在编辑区打开新笔记。",
		settingObsidianName: "启用 Obsidian 语法优化",
		settingObsidianDesc: "启用后使用 callout 等 Obsidian 扩展语法；默认输出标准 Markdown。",
		settingAdvancedTitle: "高级设置",
		settingCookieEnabledName: "启用 Cookie",
		settingCookieEnabledDesc: "用于辅助抓取受限内容。",
		settingCookieName: "Cookie",
		settingCookieDesc: "原始 Cookie 字符串，仅在启用 Cookie 时发送。",
		settingQrLoginName: "知乎扫码登录",
		settingQrLoginDesc: "使用知乎 App 扫码确认后，插件会自动保存 Cookie。",
		settingQrLoginButton: "扫码登录",
		settingUserAgentName: "User-Agent",
		settingUserAgentDesc: "用于请求知乎页面的浏览器标识，可保留默认值或按需自定义。",
		settingTimeoutName: "请求超时（毫秒）",
		settingTimeoutDesc: "页面和图片请求的超时时间。",
		modalTitle: "导入知乎回答",
		modalUrlName: "回答链接",
		modalUrlDesc: "可粘贴完整知乎回答链接，或包含该链接的整段分享文本。",
		modalTagsName: "标签",
		modalTagsDesc: "使用逗号分隔，会与默认标签合并。",
		modalCacheImagesName: "缓存图片",
		modalCacheImagesDesc: "启用后下载图片到公共资源目录，否则保留外链。",
		modalSubmit: "导入",
		modalCancel: "取消",
		qrLoginTitle: "知乎扫码登录",
		qrLoginPreparing: "正在获取二维码...",
		qrLoginWaiting: "请使用知乎 App 扫码并确认登录。",
		qrLoginScanned: "已扫码，请在手机上确认登录。",
		qrLoginBlocked: "状态轮询暂时被知乎拦截，二维码仍有效，请继续扫码确认。",
		qrLoginSuccess: "知乎登录成功，Cookie 已保存。",
		qrLoginExpired: "二维码已过期，请重新打开扫码登录。",
		qrLoginCanceled: "扫码登录已取消。",
		qrLoginFailed: "扫码登录失败：",
		noticeImporting: "正在导入知乎回答...",
		noticeSuccess: "导入完成：",
		noticeFailure: "导入失败：",
		noticeInvalidUrl: "无法识别知乎回答链接。",
		noticeNeedCookie: "目标内容可能需要 Cookie 或页面结构已变化。",
		calloutQuestion: "问题",
		calloutBackground: "背景介绍",
		calloutAnswerMeta: "回答信息",
		labelAuthor: "作者",
		labelPublishedAt: "回答时间",
		labelUpdatedAt: "更新时间",
		labelSource: "来源",
		labelAnswer: "回答",
		labelQuestion: "问题",
		labelBackground: "背景介绍"
	},
	en: {
		ribbonLabel: "Import Zhihu answer",
		commandName: "Import Zhihu answer",
		settingsTitle: "Zhihu Import Settings",
		settingImportFolderName: "Import folder",
		settingImportFolderDesc: "Vault folder used for imported Markdown notes.",
		settingAssetFolderName: "Asset folder",
		settingAssetFolderDesc: "Shared folder for cached images.",
		settingDefaultTagsName: "Default tags",
		settingDefaultTagsDesc: "Comma-separated. Merged with tags from the import dialog.",
		settingTemplateName: "Filename template",
		settingTemplateDesc: "Supports {{title}}, {{author}}, {{import_date}}, {{answer_date}}, {{question_id}}, {{answer_id}}.",
		settingDateFormatName: "Date format",
		settingDateFormatDesc: "Used in filename templates and imported_at.",
		settingLanguageName: "Language",
		settingLanguageDesc: "auto prefers Obsidian language and falls back to Chinese.",
		settingOpenFileName: "Open file after import",
		settingOpenFileDesc: "Open the created note when import finishes.",
		settingObsidianName: "Enable Obsidian syntax optimization",
		settingObsidianDesc: "Uses callouts and other Obsidian-specific syntax; otherwise outputs standard Markdown.",
		settingAdvancedTitle: "Advanced",
		settingCookieEnabledName: "Enable Cookie",
		settingCookieEnabledDesc: "Send Cookie headers for restricted content.",
		settingCookieName: "Cookie",
		settingCookieDesc: "Raw Cookie string sent only when Cookie is enabled.",
		settingQrLoginName: "Zhihu QR login",
		settingQrLoginDesc: "Scan with the Zhihu app. The plugin saves Cookie after confirmation.",
		settingQrLoginButton: "Scan to log in",
		settingUserAgentName: "User-Agent",
		settingUserAgentDesc: "Browser identifier used for Zhihu requests. Keep the default or override it if needed.",
		settingTimeoutName: "Request timeout (ms)",
		settingTimeoutDesc: "Timeout for page and image requests.",
		modalTitle: "Import Zhihu answer",
		modalUrlName: "Answer URL",
		modalUrlDesc: "Paste a Zhihu answer URL or any shared text that contains one.",
		modalTagsName: "Tags",
		modalTagsDesc: "Comma-separated. Merged with default tags.",
		modalCacheImagesName: "Cache images",
		modalCacheImagesDesc: "Download images to the shared asset folder instead of keeping remote links.",
		modalSubmit: "Import",
		modalCancel: "Cancel",
		qrLoginTitle: "Zhihu QR login",
		qrLoginPreparing: "Fetching QR code...",
		qrLoginWaiting: "Scan with the Zhihu app and confirm login.",
		qrLoginScanned: "Scanned. Confirm login on your phone.",
		qrLoginBlocked: "Status polling is temporarily blocked by Zhihu. Keep scanning or confirming the QR code.",
		qrLoginSuccess: "Zhihu login succeeded. Cookie saved.",
		qrLoginExpired: "QR code expired. Reopen QR login.",
		qrLoginCanceled: "QR login canceled.",
		qrLoginFailed: "QR login failed:",
		noticeImporting: "Importing Zhihu answer...",
		noticeSuccess: "Imported:",
		noticeFailure: "Import failed:",
		noticeInvalidUrl: "This is not a valid Zhihu answer URL.",
		noticeNeedCookie: "The page may require Cookie access or the site structure changed.",
		calloutQuestion: "Question",
		calloutBackground: "Background",
		calloutAnswerMeta: "Answer Info",
		labelAuthor: "Author",
		labelPublishedAt: "Answered At",
		labelUpdatedAt: "Updated At",
		labelSource: "Source",
		labelAnswer: "Answer",
		labelQuestion: "Question",
		labelBackground: "Background"
	}
};

export function resolveLocale(locale: Locale): ResolvedLocale {
	if (locale === "zh-CN" || locale === "en") {
		return locale;
	}
	const documentLang = document.documentElement.lang.toLowerCase();
	return documentLang.startsWith("en") ? "en" : "zh-CN";
}

export function getText(locale: Locale): TextBundle {
	return BUNDLES[resolveLocale(locale)];
}
