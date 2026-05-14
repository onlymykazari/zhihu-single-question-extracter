import {Notice, TFile} from "obsidian";
import {getText, resolveLocale} from "../i18n";
import type ZhihuImporterPlugin from "../main";
import type {ImportInput, ImportResult} from "../types";
import {mergeTags} from "../utils/tags";
import {cacheImages} from "./image-cache";
import {renderMarkdown} from "./markdown-renderer";
import {writeImportedNote} from "./file-writer";

export async function importFromInput(plugin: ZhihuImporterPlugin, input: ImportInput): Promise<ImportResult> {
	const locale = resolveLocale(plugin.settings.locale);
	const text = getText(locale);
	new Notice(text.noticeImporting);

	const adapter = plugin.adapters.find((candidate) => candidate.canHandle(input.url));
	if (!adapter) {
		throw new Error(text.noticeInvalidUrl);
	}

	const importedAt = new Date();
	const content = await adapter.extract(input.url, {
		cookie: plugin.settings.enableCookie ? plugin.settings.cookie : undefined,
		userAgent: plugin.settings.userAgent,
		timeoutMs: plugin.settings.requestTimeoutMs,
		cacheImages: input.cacheImages,
		assetFolder: plugin.settings.assetFolder,
		optimizeForObsidian: plugin.settings.optimizeForObsidian
	});

	const enrichedContent = input.cacheImages
		? await cacheImages(
			plugin.app.vault,
			content,
			plugin.settings.assetFolder,
			plugin.settings.importFolder,
			plugin.settings.requestTimeoutMs,
			plugin.settings.enableCookie ? plugin.settings.cookie : undefined
		)
		: content;

	const tags = mergeTags(plugin.settings.defaultTags, input.tags);
	const markdown = renderMarkdown(enrichedContent, {
		optimizeForObsidian: plugin.settings.optimizeForObsidian,
		locale,
		importedAt,
		dateFormat: plugin.settings.dateFormat,
		sourceUrl: input.url,
		tags
	});
	const result = await writeImportedNote(plugin.app, enrichedContent, markdown, plugin.settings, importedAt);

	if (plugin.settings.openAfterImport) {
		const file = plugin.app.vault.getAbstractFileByPath(result.filePath);
		if (file instanceof TFile) {
			await plugin.app.workspace.getLeaf(true).openFile(file);
		}
	}

	return result;
}
