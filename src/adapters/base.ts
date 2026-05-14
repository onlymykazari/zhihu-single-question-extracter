import type {ExtractContext, ExtractedContent} from "../types";

export interface SourceAdapter {
	readonly sourceType: ExtractedContent["sourceType"];
	canHandle(url: string): boolean;
	extract(url: string, context: ExtractContext): Promise<ExtractedContent>;
}
