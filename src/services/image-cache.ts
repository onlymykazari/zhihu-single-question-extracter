import {requestUrl, Vault} from "obsidian";
import type {ExtractedContent} from "../types";
import {joinVaultPath, relativeVaultPath} from "../utils/path";

function guessExtension(contentType?: string, url?: string): string {
	if (contentType?.includes("png")) return "png";
	if (contentType?.includes("webp")) return "webp";
	if (contentType?.includes("gif")) return "gif";
	if (contentType?.includes("svg")) return "svg";
	if (url) {
		const match = url.match(/\.([a-zA-Z0-9]+)(?:[?#].*)?$/);
		if (match?.[1]) return match[1].toLowerCase();
	}
	return "jpg";
}

async function ensureFolder(vault: Vault, folderPath: string): Promise<void> {
	const segments = folderPath.split("/");
	let current = "";
	for (const segment of segments) {
		current = current ? `${current}/${segment}` : segment;
		if (!vault.getAbstractFileByPath(current)) {
			await vault.createFolder(current);
		}
	}
}

export async function cacheImages(
	vault: Vault,
	content: ExtractedContent,
	assetFolder: string,
	noteFolder: string,
	timeoutMs: number,
	cookie?: string
): Promise<ExtractedContent> {
	if (!content.attachments.length) {
		return content;
	}

	await ensureFolder(vault, assetFolder);
	const headers: Record<string, string> = {
		"User-Agent": "Mozilla/5.0",
		Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
		Referer: "https://www.zhihu.com/"
	};
	if (cookie) {
		headers.Cookie = cookie;
	}

	const attachments = [...content.attachments];
	const sections = content.sections.map((section) => ({...section}));

	for (let index = 0; index < attachments.length; index += 1) {
		const item = attachments[index];
		if (!item) {
			continue;
		}
		try {
			const response = await requestUrl({
				url: item.originalUrl,
				method: "GET",
				headers,
				throw: false,
				contentType: undefined
			});
			if (response.status >= 400) {
				continue;
			}
			const extension = guessExtension(response.headers["content-type"], item.originalUrl);
			const filename = `zhihu-${content.metadata.zhihu_answer_id ?? "image"}-${index + 1}.${extension}`;
			const vaultPath = joinVaultPath(assetFolder, filename);
			const relativePath = relativeVaultPath(noteFolder, vaultPath);
			await vault.adapter.writeBinary(vaultPath, response.arrayBuffer);
			item.filename = filename;
			item.localPath = vaultPath;

			for (const section of sections) {
				section.markdown = section.markdown.split(item.originalUrl).join(relativePath);
			}
		} catch {
			continue;
		}
	}

	return {
		...content,
		attachments,
		sections
	};
}
