// Parses the plain-text résumé convention used across JobPilot (name line,
// pipe-separated contact line, ALL-CAPS section headings, "- " bullets,
// "Role | Company | Jul 2025 - May 2026" entry lines) into a structure the
// styled document templates can render.

export type ResumeBlock =
  | { type: "bullet"; text: string }
  | { type: "entry"; left: string; right: string | null }
  | { type: "text"; text: string };

export type ParsedResume = {
  name: string | null;
  contact: string[];
  sections: { heading: string; blocks: ResumeBlock[] }[];
};

const HEADING_RE = /^[A-Z][A-Z0-9 &/.\-]{2,44}$/;
const DATEISH_RE = /20\d\d|19\d\d|present|current/i;

function isHeading(line: string): boolean {
  return HEADING_RE.test(line) && !line.startsWith("- ");
}

// "Innovation Ambassador, AI | Farmville, VA | Jul 2025 - May 2026"
// → left: everything before the last date-ish pipe segment, right: that segment.
function splitEntry(line: string): { left: string; right: string | null } {
  const parts = line.split(" | ");
  if (parts.length >= 2 && DATEISH_RE.test(parts[parts.length - 1])) {
    return {
      left: parts.slice(0, -1).join(" | ").trim(),
      right: parts[parts.length - 1].trim(),
    };
  }
  return { left: line.trim(), right: null };
}

export function parseResume(content: string): ParsedResume {
  const lines = content
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l, i, arr) => l.trim() !== "" || (arr[i - 1] ?? "").trim() !== "");

  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;

  // Name: the first non-empty line, always.
  const name = lines[i]?.trim() ?? null;
  i++;

  // Contact: subsequent non-blank, non-heading lines (pipe/email/phone-ish).
  const contact: string[] = [];
  while (
    i < lines.length &&
    lines[i].trim() &&
    !isHeading(lines[i].trim()) &&
    /[@|]|\(\d{3}\)|\+\d/.test(lines[i])
  ) {
    contact.push(lines[i].trim());
    i++;
  }

  const sections: ParsedResume["sections"] = [];
  let current: ParsedResume["sections"][number] | null = null;

  for (; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isHeading(trimmed)) {
      current = { heading: trimmed, blocks: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { heading: "", blocks: [] };
      sections.push(current);
    }
    if (trimmed.startsWith("- ")) {
      current.blocks.push({ type: "bullet", text: trimmed.slice(2).trim() });
    } else {
      const prev = lines[i - 1]?.trim() ?? "";
      const isEntryish =
        (prev === "" || isHeading(prev)) &&
        (trimmed.includes(" | ") || trimmed.length <= 70);
      if (isEntryish) {
        const { left, right } = splitEntry(trimmed);
        current.blocks.push({ type: "entry", left, right });
      } else {
        current.blocks.push({ type: "text", text: trimmed });
      }
    }
  }

  return { name, contact, sections };
}
