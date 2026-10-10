import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

const URL_PATTERN = /(https?:\/\/[^\s<>"')\]]+[^\s<>"')\].,;:!?])/g;

/** Splits text into plain pieces and http(s) links. Anything that is not a plain http(s) URL stays text. */
export function splitLinks(text: string): Array<{ type: "text" | "link"; value: string }> {
  const parts: Array<{ type: "text" | "link"; value: string }> = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ type: "text", value: text.slice(last, index) });
    parts.push({ type: "link", value: match[0] });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Source notes in the data contain bare URLs; make them clickable without trusting them as HTML. */
export function LinkifiedText({ text }: { text: string }): ReactNode {
  return (
    <>
      {splitLinks(text).map((part, index) =>
        part.type === "text" ? (
          <span key={index}>{part.value}</span>
        ) : (
          <a key={index} href={part.value} target="_blank" rel="noopener noreferrer" className="break-words">
            {hostOf(part.value)}
            <ExternalLink aria-hidden="true" className="ml-0.5 inline size-3.5 align-[-1px]" />
            <span className="sr-only"> (buka di tab baru)</span>
          </a>
        ),
      )}
    </>
  );
}
