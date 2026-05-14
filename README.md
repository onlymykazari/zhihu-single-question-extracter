# Zhihu Importer

An Obsidian plugin that imports a single Zhihu answer into your vault as a structured Markdown note.

## Current scope

- Import one Zhihu answer URL from a modal, ribbon icon, or command palette
- Extract question title, optional background, and answer body
- Add frontmatter with source URL, author, answer time, import time, question ID, and answer ID
- Merge default tags from settings with per-import tags
- Optionally cache images into a shared vault folder
- Output either standard Markdown or Obsidian-enhanced Markdown with callouts
- Chinese and English UI strings

## Default behavior

- Notes are saved under `Clippings/Zhihu`
- Cached images are saved under `assets/zhihu`
- Default filename template: `{{title}} - {{author}} - {{import_date}}`
- Default tags: `zhihu`, `clipping`
- Obsidian syntax optimization is disabled by default

## Planned extension path

The codebase is structured around source adapters so future versions can add support for sites like Reddit, Stack Overflow, and Quora without rewriting the import pipeline.

## Development

```bash
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into your vault under:

```txt
.obsidian/plugins/zhihu-importer/
```
