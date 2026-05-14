# Zhihu Importer Technical Design

## Purpose

`Zhihu Importer` is an Obsidian plugin that imports a single Zhihu answer URL into the current vault as a structured Markdown note.

The `v1` goal is to make the plugin usable immediately after installation, while leaving clean extension points for `v2` support for additional sites such as Reddit, Stack Overflow, and Quora.

## Product Scope

### In scope for v1

- Import one Zhihu answer URL
- Extract three content blocks:
  - question
  - optional background / description
  - answer
- Generate Markdown notes with YAML frontmatter
- Support ribbon and command-palette entry points
- Show an import modal with:
  - URL
  - tags
  - image caching toggle
- Provide settings for:
  - import folder
  - shared asset folder
  - default tags
  - filename template
  - date format
  - UI language
  - Cookie-assisted extraction
  - Obsidian syntax optimization toggle
- Support standard Markdown output by default
- Support optional Obsidian-enhanced Markdown output
- Support Chinese and English UI strings

### Out of scope for v1

- Bulk import for all answers under one question
- Comment extraction
- Video download
- Automatic Cookie acquisition
- High-fidelity support for every Zhihu embed type

## Core Decisions

### 1. Extensible multi-site architecture

Although `v1` only implements Zhihu, the import pipeline is designed around adapters instead of hard-coding site logic into the plugin entry.

Current abstraction:

- `SourceAdapter`
- `ExtractedContent`
- shared render pipeline
- shared file writing pipeline

This keeps `v2` incremental:

- `ZhihuAdapter`
- future `RedditAdapter`
- future `StackOverflowAdapter`
- future `QuoraAdapter`

### 2. Markdown portability first

Default behavior is standard Markdown rather than Obsidian-specific syntax.

Reason:

- preserves exportability
- avoids lock-in to Obsidian-specific rendering
- matches the requirement that notes should remain portable

Optional Obsidian optimization can be enabled in settings. When enabled, the plugin may use:

- callouts
- other Obsidian-specific syntax later

### 3. Human-readable filenames

Default filenames prioritize readability over machine IDs.

Default filename template:

```txt
{{title}} - {{author}} - {{import_date}}
```

Supported variables:

- `{{title}}`
- `{{author}}`
- `{{import_date}}`
- `{{answer_date}}`
- `{{question_id}}`
- `{{answer_id}}`

`answer_id` is not included by default. It is reserved for metadata and collision handling.

### 4. Shared asset directory

When image caching is enabled, downloaded images are stored in a vault-wide shared directory instead of a per-note subfolder.

Default:

```txt
assets/zhihu/
```

This directory is configurable in plugin settings.

## User Experience

### Import flow

1. User clicks ribbon icon or runs the import command.
2. Import modal opens.
3. User pastes a Zhihu answer URL.
4. User optionally enters comma-separated tags.
5. User optionally enables image caching.
6. Plugin fetches and extracts content.
7. Plugin renders Markdown.
8. Plugin writes the note into the configured folder.
9. Plugin optionally opens the new file.

### Settings philosophy

Settings should be minimal for first use and have sensible defaults.

Default values:

```ts
{
  importFolder: "Clippings/Zhihu",
  assetFolder: "assets/zhihu",
  defaultTags: ["zhihu", "clipping"],
  filenameTemplate: "{{title}} - {{author}} - {{import_date}}",
  dateFormat: "YYYY-MM-DD",
  locale: "auto",
  enableCookie: false,
  cookie: "",
  requestTimeoutMs: 15000,
  openAfterImport: true,
  optimizeForObsidian: false
}
```

## Content Model

All site adapters should produce the same normalized structure:

```ts
interface ExtractedContent {
  sourceType: "zhihu" | "reddit" | "stackoverflow" | "quora";
  sourceUrl: string;
  title: string;
  description?: string;
  authorName?: string;
  authorUrl?: string;
  publishedAt?: string;
  updatedAt?: string;
  tags?: string[];
  sections: ContentSection[];
  attachments: RemoteImage[];
  metadata: Record<string, string>;
}
```

This prevents the renderer and file writer from caring about source-specific DOM structure.

## Rendering Strategy

The rendered note contains:

1. YAML frontmatter
2. question block
3. optional background block
4. answer metadata block
5. answer body

### Standard Markdown mode

- no callouts
- no Obsidian-only syntax
- standard Markdown image links

### Obsidian-optimized mode

- callouts for question, background, and answer metadata
- room for future Obsidian-specific syntax

## Frontmatter

Frontmatter currently includes:

- `title`
- `source`
- `author`
- `author_url`
- `answer_time`
- `updated_at`
- `imported_at`
- `zhihu_question_id`
- `zhihu_answer_id`
- `tags`

## Extraction Strategy

### Request path

The Zhihu adapter:

- validates the answer URL
- fetches the page HTML
- optionally injects Cookie header
- tries structured state extraction first
- falls back to DOM parsing

### Extraction priorities

1. embedded structured page state
2. DOM-based fallback

This is intentionally isolated in the adapter layer because Zhihu page structure is the most likely part to change.

## Image Caching

If image caching is enabled:

1. extract remote image URLs from answer content
2. download them into the shared asset folder
3. rewrite Markdown image links to vault-relative paths

Filename rule:

```txt
zhihu-{answerId}-{index}.{ext}
```

If caching is disabled:

- keep original external image links

## Tag Handling

Tags are merged from:

- settings default tags
- import modal tags

Rules:

- comma-separated parsing
- trim whitespace
- remove empty values
- de-duplicate

## Localization

Supported UI languages:

- `zh-CN`
- `en`

Localized surface:

- settings labels
- modal labels
- notices
- callout titles

User-imported note content is not translated.

## Current Code Structure

```txt
src/
  adapters/
    base.ts
    zhihu.ts
  modal/
    import-modal.ts
  services/
    file-writer.ts
    image-cache.ts
    import-service.ts
    markdown-renderer.ts
    template.ts
  utils/
    date.ts
    path.ts
    sanitize.ts
    tags.ts
    url.ts
  constants.ts
  i18n.ts
  main.ts
  settings.ts
  types.ts
```

## Risks

### 1. Zhihu page structure changes

This is the main technical risk in `v1`.

Mitigation:

- isolate extraction logic in `ZhihuAdapter`
- keep fallback DOM extraction

### 2. Restricted content

Some pages may require Cookie-assisted access.

Mitigation:

- advanced Cookie setting
- clear user-facing error messaging

### 3. HTML to Markdown fidelity

Some rich content may not convert perfectly in `v1`.

Mitigation:

- start with robust core elements
- improve element coverage incrementally

## Testing Plan

### Minimum practical test set

1. public answer with normal text
2. answer with no background block
3. answer with multiple images
4. import without image caching
5. import with image caching
6. duplicate filename case
7. default tags + modal tags merge
8. standard Markdown mode
9. Obsidian optimization mode
10. Cookie-enabled extraction path

## Release / Distribution Notes

For BRAT testing, the repository must expose the installable plugin artifacts:

- `manifest.json`
- `main.js`
- `styles.css`

This can be done in either of two ways:

1. commit build artifacts into the repository root
2. publish a GitHub release containing those files

The current repository structure already has the source and root manifest files, but whether BRAT can install directly depends on how build artifacts are published.

## Milestone Status

### Completed

- plugin skeleton replaced
- extensible adapter architecture added
- Zhihu adapter added
- import modal added
- settings model expanded
- i18n added
- standard / Obsidian render modes added
- optional image caching added

### Next

- real-vault BRAT installation test
- real Zhihu URL import test
- extractor robustness fixes based on test samples
- packaging decision for BRAT and release flow
