import {normalizePath} from "obsidian";

export function joinVaultPath(...parts: string[]): string {
	return normalizePath(parts.filter(Boolean).join("/"));
}

export function relativeVaultPath(fromFolder: string, targetPath: string): string {
	const fromParts = normalizePath(fromFolder).split("/").filter(Boolean);
	const targetParts = normalizePath(targetPath).split("/").filter(Boolean);

	while (fromParts.length && targetParts.length && fromParts[0] === targetParts[0]) {
		fromParts.shift();
		targetParts.shift();
	}

	const upSegments = fromParts.map(() => "..");
	return [...upSegments, ...targetParts].join("/") || ".";
}
