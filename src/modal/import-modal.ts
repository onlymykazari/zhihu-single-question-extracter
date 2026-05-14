import {App, ButtonComponent, Modal, Setting, TextComponent, ToggleComponent} from "obsidian";
import {getText} from "../i18n";
import type {ImportInput, Locale} from "../types";
import {parseTags} from "../utils/tags";
import {extractZhihuAnswerUrl, parseZhihuAnswerUrl} from "../utils/url";

export class ImportModal extends Modal {
	private readonly locale: Locale;
	private readonly onSubmit: (value: ImportInput) => Promise<void>;
	private readonly initialCacheImages: boolean;
	private urlValue = "";
	private tagsValue = "";
	private cacheImages = false;
	private submitButton?: ButtonComponent;

	constructor(app: App, locale: Locale, initialCacheImages: boolean, onSubmit: (value: ImportInput) => Promise<void>) {
		super(app);
		this.locale = locale;
		this.onSubmit = onSubmit;
		this.initialCacheImages = initialCacheImages;
		this.cacheImages = initialCacheImages;
	}

	onOpen(): void {
		const text = getText(this.locale);
		this.titleEl.setText(text.modalTitle);
		this.contentEl.empty();

		new Setting(this.contentEl)
			.setName(text.modalUrlName)
			.setDesc(text.modalUrlDesc)
			.addText((component: TextComponent) => {
				component.setPlaceholder("https://www.zhihu.com/question/.../answer/...");
				component.onChange((value) => {
					this.urlValue = extractZhihuAnswerUrl(value) ?? value.trim();
					this.refreshSubmitState();
				});
				window.setTimeout(() => component.inputEl.focus(), 0);
			});

		new Setting(this.contentEl)
			.setName(text.modalTagsName)
			.setDesc(text.modalTagsDesc)
			.addText((component: TextComponent) => {
				component.setPlaceholder("zhihu, clipping");
				component.onChange((value) => {
					this.tagsValue = value;
				});
			});

		new Setting(this.contentEl)
			.setName(text.modalCacheImagesName)
			.setDesc(text.modalCacheImagesDesc)
			.addToggle((component: ToggleComponent) => {
				component.setValue(this.initialCacheImages);
				component.onChange((value) => {
					this.cacheImages = value;
				});
			});

		const actions = new Setting(this.contentEl);
		actions.addButton((button) => {
			button.setButtonText(text.modalCancel);
			button.onClick(() => this.close());
		});
		actions.addButton((button) => {
			this.submitButton = button;
			button.setButtonText(text.modalSubmit);
			button.setCta();
			button.setDisabled(true);
			button.onClick(async () => {
				if (!parseZhihuAnswerUrl(this.urlValue)) {
					return;
				}
				button.setDisabled(true);
				try {
					await this.onSubmit({
						url: this.urlValue,
						tags: parseTags(this.tagsValue),
						cacheImages: this.cacheImages
					});
					this.close();
				} finally {
					button.setDisabled(false);
				}
			});
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private refreshSubmitState(): void {
		this.submitButton?.setDisabled(parseZhihuAnswerUrl(this.urlValue) === null);
	}
}
