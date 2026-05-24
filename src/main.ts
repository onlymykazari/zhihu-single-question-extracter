import {addIcon, Notice, Plugin} from "obsidian";
import {ZhihuAdapter} from "./adapters/zhihu";
import {getText, resolveLocale} from "./i18n";
import {ImportModal} from "./modal/import-modal";
import {DEFAULT_SETTINGS, ZhihuImporterSettingTab} from "./settings";
import {importFromInput} from "./services/import-service";
import type {SourceAdapter} from "./adapters/base";
import type {PluginSettings} from "./types";

const ZHIHU_IMPORTER_ICON = "zhihu-importer-qa-download";

const ZHIHU_IMPORTER_ICON_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
	<rect x="10" y="14" width="64" height="52" rx="14" ry="14" fill="none" stroke="currentColor" stroke-width="7"/>
	<path d="M28 66 L24 78 L38 69" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
	<text x="42" y="48" text-anchor="middle" font-size="20" font-weight="700" font-family="Arial, sans-serif" fill="currentColor">Q&amp;A</text>
	<circle cx="74" cy="72" r="16" fill="currentColor"/>
	<path d="M74 62 V76" fill="none" stroke="var(--background-primary, white)" stroke-width="6" stroke-linecap="round"/>
	<path d="M67 72 L74 79 L81 72" fill="none" stroke="var(--background-primary, white)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
	<path d="M64 84 H84" fill="none" stroke="var(--background-primary, white)" stroke-width="6" stroke-linecap="round"/>
</svg>
`;

export default class ZhihuImporterPlugin extends Plugin {
	settings: PluginSettings = DEFAULT_SETTINGS;
	adapters: SourceAdapter[] = [];

	async onload(): Promise<void> {
		await this.loadSettings();
		this.adapters = [new ZhihuAdapter()];
		addIcon(ZHIHU_IMPORTER_ICON, ZHIHU_IMPORTER_ICON_SVG);

		const text = getText(this.settings.locale);
		this.addRibbonIcon(ZHIHU_IMPORTER_ICON, text.ribbonLabel, () => {
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
