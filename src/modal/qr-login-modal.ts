import {App, Modal, Notice, Setting} from "obsidian";
import {getText} from "../i18n";
import {createZhihuQrLoginSession, pollZhihuQrLogin, ZhihuQrLoginSession} from "../services/zhihu-auth";
import type {Locale} from "../types";

export class QrLoginModal extends Modal {
	private readonly locale: Locale;
	private readonly userAgent: string;
	private readonly timeoutMs: number;
	private readonly onSuccess: (cookie: string) => Promise<void>;
	private session?: ZhihuQrLoginSession;
	private pollTimer?: number;
	private stopped = false;
	private statusEl?: HTMLElement;

	constructor(
		app: App,
		locale: Locale,
		userAgent: string,
		timeoutMs: number,
		onSuccess: (cookie: string) => Promise<void>
	) {
		super(app);
		this.locale = locale;
		this.userAgent = userAgent;
		this.timeoutMs = timeoutMs;
		this.onSuccess = onSuccess;
	}

	onOpen(): void {
		const text = getText(this.locale);
		this.titleEl.setText(text.qrLoginTitle);
		this.contentEl.empty();
		this.statusEl = this.contentEl.createEl("p", {text: text.qrLoginPreparing});

		new Setting(this.contentEl)
			.addButton((button) => button
				.setButtonText(text.modalCancel)
				.onClick(() => this.close()));

		void this.start();
	}

	onClose(): void {
		this.stopped = true;
		if (this.pollTimer) {
			window.clearTimeout(this.pollTimer);
		}
		this.contentEl.empty();
	}

	private async start(): Promise<void> {
		const text = getText(this.locale);
		try {
			this.session = await createZhihuQrLoginSession(this.userAgent, this.timeoutMs);
			if (this.stopped) {
				return;
			}
			this.contentEl.createEl("img", {
				attr: {
					src: this.session.qrCodeDataUrl,
					alt: text.qrLoginTitle,
					width: "240",
					height: "240"
				}
			});
			this.setStatus(text.qrLoginWaiting);
			this.pollTimer = window.setTimeout(() => void this.poll(), 1500);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.setStatus(`${text.qrLoginFailed} ${message}`);
		}
	}

	private async poll(): Promise<void> {
		if (this.stopped || !this.session) {
			return;
		}

		const text = getText(this.locale);
		try {
			const result = await pollZhihuQrLogin(this.session, this.userAgent, this.timeoutMs);
			if (this.stopped) {
				return;
			}
			if (result.status === "success" && result.cookie) {
				await this.onSuccess(result.cookie);
				new Notice(text.qrLoginSuccess);
				this.close();
				return;
			}
			if (result.status === "scanned") {
				this.setStatus(text.qrLoginScanned);
			} else if (result.status === "expired") {
				this.setStatus(text.qrLoginExpired);
				return;
			} else if (result.status === "canceled") {
				this.setStatus(text.qrLoginCanceled);
				return;
			} else {
				this.setStatus(result.message ? `${text.qrLoginWaiting} ${result.message}` : text.qrLoginWaiting);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.setStatus(`${text.qrLoginFailed} ${message}`);
			return;
		}

		this.pollTimer = window.setTimeout(() => void this.poll(), 2000);
	}

	private setStatus(message: string): void {
		if (this.statusEl) {
			this.statusEl.setText(message);
		}
	}
}
