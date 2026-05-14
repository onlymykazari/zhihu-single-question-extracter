import type {ExtractedContent, ImportResult, PluginSettings} from "../types";
import {joinVaultPath} from "../utils/path";
import {applyFilenameTemplate} from "./template";
import type {App} from "obsidian";

async function ensureFolder(app: App, folderPath: string): Promise<void> {
	const segments = folderPath.split("/");
	let current = "";
	for (const segment of segments) {
		current = current ? `${current}/${segment}` : segment;
		if (!app.vault.getAbstractFileByPath(current)) {
			await app.vault.createFolder(current);
		}
	}
}

export async function writeImportedNote(
	app: App,
	content: ExtractedContent,
	markdown: string,
	settings: PluginSettings,
	importedAt: Date
): Promise<ImportResult> {
	await ensureFolder(app, settings.importFolder);
	let filename = applyFilenameTemplate(settings.filenameTemplate, content, importedAt, settings.dateFormat);
	let fullPath = joinVaultPath(settings.importFolder, `${filename}.md`);

	if (app.vault.getAbstractFileByPath(fullPath)) {
		const suffix = content.metadata.zhihu_answer_id ? ` - ${content.metadata.zhihu_answer_id}` : " - 2";
		filename += suffix;
		fullPath = joinVaultPath(settings.importFolder, `${filename}.md`);
	}

	await app.vault.create(fullPath, markdown);
	return {filePath: fullPath, title: content.title};
}
