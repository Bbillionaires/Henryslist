// A minimal, dependency-free HTML sanitizer for admin-authored static pages
// (Terms, Privacy, etc). Deliberately narrow: strips everything to a small
// tag allowlist rather than trying to be a general-purpose sanitizer. This
// exists because jsdom-based sanitizers (isomorphic-dompurify) don't bundle
// cleanly under Next.js's server build — for this bounded use case (an
// admin, not arbitrary users, authoring a handful of legal pages) a simple
// allowlist is both sufficient and more reliable.
const ALLOWED_TAGS = new Set(["h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a", "br"]);

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  return /^(https?:|mailto:|\/|#)/i.test(trimmed) && !/^javascript:/i.test(trimmed);
}

export function sanitizeStaticHtml(html: string): string {
  return html.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tagName: string, attrs: string) => {
    const tag = tagName.toLowerCase();
    const isClosing = match.startsWith("</");
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (isClosing) return `</${tag}>`;

    if (tag === "a") {
      const hrefMatch = attrs.match(/href\s*=\s*"([^"]*)"/i) ?? attrs.match(/href\s*=\s*'([^']*)'/i);
      const href = hrefMatch?.[1];
      if (href && isSafeHref(href)) {
        return `<a href="${href.replace(/"/g, "&quot;")}" rel="noopener noreferrer">`;
      }
      return "<a>";
    }

    return `<${tag}>`;
  });
}
