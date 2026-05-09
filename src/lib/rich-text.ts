/**
 * Convert lightweight rich-text HTML into plain text for list/search previews.
 */
export function richTextToPlainText(value: string): string {
    return value
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim()
}

/**
 * Basic sanitizer for TipTap-authored HTML before rendering.
 * We still keep this conservative and remove obvious script/event payloads.
 */
export function sanitizeRichTextHtml(value: string): string {
    return value
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
        .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
        .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
        .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
        .replace(/javascript:/gi, "")
}

/**
 * Convert a possibly-plaintext value into HTML the rich-text editor can load.
 * If the value already looks like HTML it is returned unchanged; otherwise
 * newlines are turned into <p>/<br>. Used to migrate notes written before
 * the editor was upgraded.
 */
export function ensureRichTextHtml(value: string | null | undefined): string {
    if (!value) return ""
    if (/<\w+[^>]*>/.test(value)) return value
    const escape = (s: string) =>
        s
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
    return value
        .split(/\n{2,}/)
        .map((para) => `<p>${escape(para).replace(/\n/g, "<br>")}</p>`)
        .join("")
}

/**
 * Returns true when rich-text HTML has no visible content (e.g. "<p></p>").
 */
export function isRichTextEmpty(value: string | null | undefined): boolean {
    if (!value) return true
    return richTextToPlainText(value).trim().length === 0
}
