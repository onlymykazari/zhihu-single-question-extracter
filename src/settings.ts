import {App, PluginSettingTab, Setting} from "obsidian";
import {DEFAULT_ASSET_FOLDER, DEFAULT_DATE_FORMAT, DEFAULT_FILENAME_TEMPLATE, DEFAULT_IMPORT_FOLDER, DEFAULT_REQUEST_TIMEOUT_MS, DEFAULT_TAGS, DEFAULT_USER_AGENT} from "./constants";
import {getText} from "./i18n";
import type ZhihuImporterPlugin from "./main";
import type {PluginSettings} from "./types";
import {parseTags} from "./utils/tags";

export const DEFAULT_SETTINGS: PluginSettings = {
	importFolder: DEFAULT_IMPORT_FOLDER,
	assetFolder: DEFAULT_ASSET_FOLDER,
	defaultTags: DEFAULT_TAGS,
	filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
	dateFormat: DEFAULT_DATE_FORMAT,
	locale: "auto",
	enableCookie: false,
	cookie: "",
	userAgent: DEFAULT_USER_AGENT,
	requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
	openAfterImport: true,
	optimizeForObsidian: false
};

export class ZhihuImporterSettingTab extends PluginSettingTab {
	plugin: ZhihuImporterPlugin;

	constructor(app: App, plugin: ZhihuImporterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		const text = getText(this.plugin.settings.locale);
		containerEl.empty();

		new Setting(containerEl)
			.setName(text.settingImportFolderName)
			.setDesc(text.settingImportFolderDesc)
			.addText((component) => component
				.setPlaceholder(DEFAULT_IMPORT_FOLDER)
				.setValue(this.plugin.settings.importFolder)
				.onChange(async (value) => {
					this.plugin.settings.importFolder = value.trim() || DEFAULT_IMPORT_FOLDER;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(text.settingAssetFolderName)
			.setDesc(text.settingAssetFolderDesc)
			.addText((component) => component
				.setPlaceholder(DEFAULT_ASSET_FOLDER)
				.setValue(this.plugin.settings.assetFolder)
				.onChange(async (value) => {
					this.plugin.settings.assetFolder = value.trim() || DEFAULT_ASSET_FOLDER;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(text.settingDefaultTagsName)
			.setDesc(text.settingDefaultTagsDesc)
			.addText((component) => component
				.setPlaceholder(DEFAULT_TAGS.join(", "))
				.setValue(this.plugin.settings.defaultTags.join(", "))
				.onChange(async (value) => {
					this.plugin.settings.defaultTags = parseTags(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(text.settingTemplateName)
			.setDesc(text.settingTemplateDesc)
			.addText((component) => component
				.setPlaceholder(DEFAULT_FILENAME_TEMPLATE)
				.setValue(this.plugin.settings.filenameTemplate)
				.onChange(async (value) => {
					this.plugin.settings.filenameTemplate = value.trim() || DEFAULT_FILENAME_TEMPLATE;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(text.settingDateFormatName)
			.setDesc(text.settingDateFormatDesc)
			.addText((component) => component
				.setPlaceholder(DEFAULT_DATE_FORMAT)
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value.trim() || DEFAULT_DATE_FORMAT;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(text.settingLanguageName)
			.setDesc(text.settingLanguageDesc)
			.addDropdown((component) => component
				.addOption("auto", "auto")
				.addOption("zh-CN", "中文")
				.addOption("en", "English")
				.setValue(this.plugin.settings.locale)
				.onChange(async (value) => {
					this.plugin.settings.locale = value as PluginSettings["locale"];
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName(text.settingOpenFileName)
			.setDesc(text.settingOpenFileDesc)
			.addToggle((component) => component
				.setValue(this.plugin.settings.openAfterImport)
				.onChange(async (value) => {
					this.plugin.settings.openAfterImport = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(text.settingObsidianName)
			.setDesc(text.settingObsidianDesc)
			.addToggle((component) => component
				.setValue(this.plugin.settings.optimizeForObsidian)
				.onChange(async (value) => {
					this.plugin.settings.optimizeForObsidian = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl("h3", {text: text.settingAdvancedTitle});

		new Setting(containerEl)
			.setName(text.settingCookieEnabledName)
			.setDesc(text.settingCookieEnabledDesc)
			.addToggle((component) => component
				.setValue(this.plugin.settings.enableCookie)
				.onChange(async (value) => {
					this.plugin.settings.enableCookie = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(text.settingCookieName)
			.setDesc(text.settingCookieDesc)
			.addTextArea((component) => component
				.setPlaceholder("z_c0=...")
				.setValue(this.plugin.settings.cookie)
				.onChange(async (value) => {
					this.plugin.settings.cookie = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(text.settingUserAgentName)
			.setDesc(text.settingUserAgentDesc)
			.addTextArea((component) => component
				.setPlaceholder(DEFAULT_USER_AGENT)
				.setValue(this.plugin.settings.userAgent)
				.onChange(async (value) => {
					this.plugin.settings.userAgent = value.trim() || DEFAULT_USER_AGENT;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(text.settingTimeoutName)
			.setDesc(text.settingTimeoutDesc)
			.addText((component) => component
				.setPlaceholder(String(DEFAULT_REQUEST_TIMEOUT_MS))
				.setValue(String(this.plugin.settings.requestTimeoutMs))
				.onChange(async (value) => {
					const parsed = Number.parseInt(value, 10);
					this.plugin.settings.requestTimeoutMs = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REQUEST_TIMEOUT_MS;
					await this.plugin.saveSettings();
				}));
	}
}
