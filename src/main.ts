import {Notice, Plugin} from "obsidian";
import {ZhihuAdapter} from "./adapters/zhihu";
import {getText, resolveLocale} from "./i18n";
import {ImportModal} from "./modal/import-modal";
import {DEFAULT_SETTINGS, ZhihuImporterSettingTab} from "./settings";
import {importFromInput} from "./services/import-service";
import type {SourceAdapter} from "./adapters/base";
import type {PluginSettings} from "./types";

export default class ZhihuImporterPlugin extends Plugin {
	settings: PluginSettings = DEFAULT_SETTINGS;
	adapters: SourceAdapter[] = [];

	async onload(): Promise<void> {
		await this.loadSettings();
		this.adapters = [new ZhihuAdapter()];

		const text = getText(this.settings.locale);
		this.addRibbonIcon("download", text.ribbonLabel, () => {
			this.openImportModal();
		});

		this.addCommand({
			id: "import-zhihu-answer",
			name: text.commandName,
			callback: () => this.openImportModal()
		});

		this.addSettingTab(new ZhihuImporterSettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		const loaded = await this.loadData() as Partial<PluginSettings> | null;
		this.settings = {
			...DEFAULT_SETTINGS,
			...loaded,
			defaultTags: loaded?.defaultTags ?? DEFAULT_SETTINGS.defaultTags
		};
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	openImportModal(): void {
		new ImportModal(this.app, this.settings.locale, false, async (input) => {
			try {
				const result = await importFromInput(this, input);
				const locale = resolveLocale(this.settings.locale);
				const text = getText(locale);
				new Notice(`${text.noticeSuccess} ${result.title}`);
			} catch (error) {
				const locale = resolveLocale(this.settings.locale);
				const text = getText(locale);
				const message = error instanceof Error ? error.message : text.noticeNeedCookie;
				new Notice(`${text.noticeFailure} ${message}`);
				console.error("Zhihu importer failed", error);
			}
		}).open();
	}
}
