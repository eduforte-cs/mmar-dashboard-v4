import React from "react";

// Renders an i18n string with two inline markup tokens:
//
//   **bold**   → <strong> (semibold accent)
//   [d]dim[/d] → <span style={{ color: dimColor }}> (faint colour)
//
// Plain text passes through unchanged. Returns an array of React nodes
// suitable for embedding inside a parent element.
//
// `dimColor` is the theme's faint colour for the [d]…[/d] marker.
// `accentColor` is the colour applied to **bold** text. When the parent
// paragraph is itself dimmed (as in Backtest's narrative paragraphs),
// pass the accent so emphasised values pop against the muted body. When
// the parent paragraph is already cream (as in the Whitepaper), pass
// `undefined` and the strong tag will simply inherit the parent colour.
//
// Both colours must be passed in by the caller because this helper is a
// plain function, not a hook, and therefore can't read theme context
// itself.
export function renderMd(str, { dimColor, accentColor } = {}) {
  if (str == null) return null;
  const re = /\*\*(.+?)\*\*|\[d\]([\s\S]+?)\[\/d\]/g;
  const out = [];
  let cursor = 0;
  let key = 0;
  let m;
  while ((m = re.exec(str)) !== null) {
    if (m.index > cursor) out.push(str.slice(cursor, m.index));
    if (m[1] !== undefined) {
      const style = { fontWeight: 600 };
      if (accentColor) style.color = accentColor;
      out.push(
        <strong key={`md-${key++}`} style={style}>
          {m[1]}
        </strong>
      );
    } else {
      out.push(
        <span key={`md-${key++}`} style={{ color: dimColor }}>
          {m[2]}
        </span>
      );
    }
    cursor = m.index + m[0].length;
  }
  if (cursor < str.length) out.push(str.slice(cursor));
  return out;
}
