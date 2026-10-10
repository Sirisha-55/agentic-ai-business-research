/** Turn plain-text URLs in generated Markdown into safe Markdown links. */
export function linkifyBareUrls(markdown: string): string {
  return markdown.replace(
    /https?:\/\/[^\s<>()\]]+/g,
    (candidate, offset: number, source: string) => {
      const previous = source[offset - 1];

      // Keep URLs that are already part of Markdown links/autolinks intact.
      if (previous === "(" || previous === "<" || previous === "[") {
        return candidate;
      }

      const trailingPunctuation = candidate.match(/[.,;:]+$/)?.[0] ?? "";
      const url = trailingPunctuation
        ? candidate.slice(0, -trailingPunctuation.length)
        : candidate;

      if (!url) return candidate;
      return `[${url}](${url})${trailingPunctuation}`;
    },
  );
}
