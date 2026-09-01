/**
 * Minimal syntax tokeniser for the export dialog.
 *
 * Deliberately dependency-free: the exported snippets are the product's whole
 * pitch ("no extra packages"), and pulling in Shiki or Prism to colour them
 * would outweigh every other dependency in the app.
 *
 * One combined regex scanned left-to-right, so the *earliest* construct always
 * wins. That ordering is what keeps the generated code correct: the exports
 * embed GLSL inside JS string literals, full of slash-slash and block-comment
 * sequences that a naive comment-first pass would mistake for real comments.
 */

export type TokenKind =
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "fn"
  | "tag"
  | "attr"
  | "plain";

export interface Token {
  text: string;
  kind: TokenKind;
}

/** Past this, colouring costs more than it's worth; render it plain. */
const MAX_HIGHLIGHT_CHARS = 200_000;

const KEYWORDS = [
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "new", "typeof", "instanceof", "class", "extends", "import", "export",
  "from", "as", "default", "null", "undefined", "true", "false", "this",
  "void", "in", "of", "do", "break", "continue", "switch", "case", "try",
  "catch", "finally", "throw", "await", "async", "yield", "delete",
  "interface", "type", "declare", "readonly", "enum", "namespace", "public",
  "private", "protected", "static", "implements", "abstract", "satisfies",
].join("|");

const COMMENT = String.raw`(?<comment>\/\*[\s\S]*?\*\/|\/\/[^\n]*)`;
const STRING = String.raw`(?<string>"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\`(?:\\[\s\S]|[^\`\\])*\`)`;
const NUMBER = String.raw`(?<number>\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b)`;
const KEYWORD = String.raw`(?<keyword>\b(?:${KEYWORDS})\b)`;
const FN = String.raw`(?<fn>[A-Za-z_$][\w$]*)(?=\s*\()`;
const TAG = String.raw`(?<tag><\/?[a-zA-Z][\w-]*)`;
const ATTR = String.raw`(?<attr>[a-zA-Z-]+)(?=\s*=\s*["'])`;

/*
 * HTML puts tag/attr first so markup wins inside `<script>`-bearing documents;
 * comment and string still precede them, so a tag mentioned inside a string
 * stays a string.
 */
function pattern(html: boolean) {
  const parts = html
    ? [COMMENT, STRING, TAG, ATTR, NUMBER, KEYWORD, FN]
    : [COMMENT, STRING, NUMBER, KEYWORD, FN];
  return new RegExp(parts.join("|"), "g");
}

const JS_RE = pattern(false);
const HTML_RE = pattern(true);

/** Split `code` into coloured runs. Adjacent plain text is coalesced. */
export function tokenize(code: string, html = false): Token[] {
  if (!code) return [];
  if (code.length > MAX_HIGHLIGHT_CHARS) return [{ text: code, kind: "plain" }];

  const re = html ? HTML_RE : JS_RE;
  re.lastIndex = 0;

  const out: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  const pushPlain = (text: string) => {
    if (!text) return;
    const prev = out[out.length - 1];
    if (prev && prev.kind === "plain") prev.text += text;
    else out.push({ text, kind: "plain" });
  };

  while ((m = re.exec(code)) !== null) {
    // A zero-length match would spin forever; step past it.
    if (m[0] === "") {
      re.lastIndex += 1;
      continue;
    }
    pushPlain(code.slice(last, m.index));
    const groups = m.groups ?? {};
    const kind = (Object.keys(groups).find((k) => groups[k] !== undefined) ??
      "plain") as TokenKind;
    out.push({ text: m[0], kind });
    last = m.index + m[0].length;
  }
  pushPlain(code.slice(last));
  return out;
}
