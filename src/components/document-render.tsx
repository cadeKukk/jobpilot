import type { CSSProperties } from "react";
import { parseResume } from "@/lib/resume-parse";

// Style guides for the document output. All sizes are em-based so the
// one-page auto-fit (which adjusts the wrapper font-size) scales everything
// proportionally. Every style is ATS-safe: real text, single column, no
// graphics.
export const DOC_STYLES = {
  classic: {
    label: "CLASSIC",
    description: "Serif, centered header — traditional résumé",
    font: "Georgia, 'Times New Roman', serif",
    headerAlign: "center" as const,
    nameStyle: {
      fontSize: "1.85em",
      letterSpacing: "0.04em",
      fontWeight: 700,
    } as CSSProperties,
    headingStyle: {
      fontSize: "0.85em",
      fontWeight: 700,
      letterSpacing: "0.14em",
      borderBottom: "1px solid #171717",
      paddingBottom: "0.25em",
      marginBottom: "0.5em",
    } as CSSProperties,
    bullet: "•",
  },
  modern: {
    label: "MODERN",
    description: "Clean sans-serif, left-aligned header",
    font: "Helvetica, Arial, sans-serif",
    headerAlign: "left" as const,
    nameStyle: {
      fontSize: "1.7em",
      letterSpacing: "0.01em",
      fontWeight: 700,
    } as CSSProperties,
    headingStyle: {
      fontSize: "0.8em",
      fontWeight: 700,
      letterSpacing: "0.18em",
      borderBottom: "1px solid #d4d4d4",
      paddingBottom: "0.3em",
      marginBottom: "0.55em",
    } as CSSProperties,
    bullet: "–",
  },
  compact: {
    label: "COMPACT",
    description: "Dense sans-serif — maximum content per page",
    font: "Helvetica, Arial, sans-serif",
    headerAlign: "left" as const,
    nameStyle: {
      fontSize: "1.4em",
      fontWeight: 700,
    } as CSSProperties,
    headingStyle: {
      fontSize: "0.78em",
      fontWeight: 700,
      letterSpacing: "0.1em",
      marginBottom: "0.3em",
    } as CSSProperties,
    bullet: "-",
  },
  mono: {
    label: "MONO",
    description: "Monospace editorial — matches the JobPilot aesthetic",
    font: "ui-monospace, 'SF Mono', Menlo, monospace",
    headerAlign: "left" as const,
    nameStyle: {
      fontSize: "1.35em",
      letterSpacing: "0.08em",
      fontWeight: 700,
      textTransform: "uppercase" as const,
    } as CSSProperties,
    headingStyle: {
      fontSize: "0.8em",
      fontWeight: 700,
      letterSpacing: "0.16em",
      marginBottom: "0.45em",
    } as CSSProperties,
    bullet: "-",
  },
} as const;

export type DocStyleId = keyof typeof DOC_STYLES;

export function isDocStyle(v: string | undefined | null): v is DocStyleId {
  return !!v && v in DOC_STYLES;
}

const sectionGap = (styleId: DocStyleId) =>
  styleId === "compact" ? "0.7em" : "1.05em";

export function DocumentRender({
  kind,
  content,
  styleId,
  dateLabel,
}: {
  kind: string;
  content: string;
  styleId: DocStyleId;
  dateLabel: string;
}) {
  const s = DOC_STYLES[styleId];

  if (kind !== "resume") {
    // Cover letter: date line + paragraphs in the chosen face.
    const paragraphs = content.split(/\n\s*\n/).map((p) => p.trim());
    return (
      <div style={{ fontFamily: s.font, color: "#171717" }}>
        <p style={{ textAlign: "right", marginBottom: "1.6em" }}>{dateLabel}</p>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ marginBottom: "0.9em", whiteSpace: "pre-wrap" }}>
            {p}
          </p>
        ))}
      </div>
    );
  }

  const parsed = parseResume(content);
  const headingLabel = (h: string) =>
    styleId === "mono" ? `[ ${h} ]` : h;

  return (
    <div style={{ fontFamily: s.font, color: "#171717" }}>
      <header
        style={{
          textAlign: s.headerAlign,
          marginBottom: "1.1em",
          ...(styleId === "classic"
            ? { borderBottom: "2px solid #171717", paddingBottom: "0.7em" }
            : {}),
        }}
      >
        {parsed.name && <div style={s.nameStyle}>{parsed.name}</div>}
        {parsed.contact.map((line, i) => (
          <div key={i} style={{ fontSize: "0.85em", marginTop: "0.3em" }}>
            {line}
          </div>
        ))}
      </header>

      {parsed.sections.map((section, si) => (
        <section key={si} style={{ marginBottom: sectionGap(styleId) }}>
          {section.heading && (
            <h2
              style={{
                marginTop: 0,
                marginRight: 0,
                marginBottom: 0,
                marginLeft: 0,
                ...s.headingStyle,
              }}
            >
              {headingLabel(section.heading)}
            </h2>
          )}
          {section.blocks.map((block, bi) => {
            if (block.type === "bullet") {
              return (
                <div
                  key={bi}
                  style={{
                    display: "flex",
                    gap: "0.55em",
                    marginBottom: "0.18em",
                  }}
                >
                  <span aria-hidden>{s.bullet}</span>
                  <span style={{ flex: 1 }}>{block.text}</span>
                </div>
              );
            }
            if (block.type === "entry") {
              return (
                <div
                  key={bi}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1em",
                    fontWeight: 700,
                    marginTop: bi === 0 ? 0 : "0.55em",
                    marginBottom: "0.14em",
                  }}
                >
                  <span>{block.left}</span>
                  {block.right && (
                    <span style={{ fontWeight: 400, whiteSpace: "nowrap" }}>
                      {block.right}
                    </span>
                  )}
                </div>
              );
            }
            return (
              <p key={bi} style={{ margin: "0 0 0.3em" }}>
                {block.text}
              </p>
            );
          })}
        </section>
      ))}
    </div>
  );
}
