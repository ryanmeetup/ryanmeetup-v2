import type { JSONContent } from "@tiptap/core";

const normalizeRichTextValue = (value: unknown) =>
  (Array.isArray(value) ? value.join("\n") : String(value ?? ""))
    .replace(/\r\n?/g, "\n")
    .replace(/<br\s*\/?\s*>/gi, "\n");

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const inlineMarkdownToHtml = (value: string) =>
  escapeHtml(value)
    .replace(/\*\*\*([^*\n]+)\*\*\*/g, "<em><strong>$1</strong></em>")
    .replace(/___([^_\n]+)___/g, "<em><strong>$1</strong></em>")
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_\n]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>");

type ListKind = "bullet" | "ordered" | "task";
type ParsedListLine = {
  depth: number;
  kind: ListKind;
  checked: boolean;
  text: string;
};

type ParsedHeadingLine = {
  level: number;
  text: string;
};

const parseHeadingLine = (line: string): ParsedHeadingLine | null => {
  const match = line.match(/^(#{1,6})[\t ]+(.+?)(?:[\t ]+#+[\t ]*)?$/);
  return match ? { level: match[1].length, text: match[2] } : null;
};

const parseListLine = (line: string): ParsedListLine | null => {
  const match = line.match(
    /^(\s*)([-*+]|\d+\.)(?:\s+(?:\[([ xX])\]\s*)?(.*))?$/,
  );
  if (!match) return null;
  const whitespace = match[1].replace(/\t/g, "  ").length;
  const depth = Math.floor(whitespace / 2);
  const task = match[3] !== undefined;
  return {
    depth,
    kind: task
      ? "task"
      : /^\d/.test(match[2]) && depth === 0
        ? "ordered"
        : "bullet",
    checked: task && match[3].toLowerCase() === "x",
    text: match[4] ?? "",
  };
};

const listTags = (kind: ListKind) =>
  kind === "ordered"
    ? ["<ol>", "</ol>"]
    : kind === "task"
      ? ['<ul data-type="taskList">', "</ul>"]
      : ["<ul>", "</ul>"];

function renderList(
  items: ParsedListLine[],
  start: number,
  depth: number,
  kind: ListKind,
): [string, number] {
  const [open, close] = listTags(kind);
  let html = open;
  let index = start;
  while (index < items.length) {
    const item = items[index];
    if (item.depth < depth || (item.depth === depth && item.kind !== kind))
      break;
    if (item.depth > depth) break;
    const itemOpen =
      kind === "task"
        ? `<li data-type="taskItem" data-checked="${item.checked}"><p>`
        : "<li><p>";
    html += `${itemOpen}${item.text ? inlineMarkdownToHtml(item.text) : "<br>"}</p>`;
    index += 1;
    while (index < items.length && items[index].depth > depth) {
      const child = items[index];
      const childKind = child.kind === "ordered" ? "bullet" : child.kind;
      const rendered = renderList(items, index, child.depth, childKind);
      html += rendered[0];
      index = rendered[1];
    }
    html += "</li>";
  }
  return [`${html}${close}`, index];
}

const markdownToHtml = (markdown: unknown) => {
  const lines = normalizeRichTextValue(markdown).split("\n");
  const blocks: string[] = [];
  let index = 0;
  while (index < lines.length) {
    if (!lines[index].trim()) {
      blocks.push("<p><br></p>");
      index += 1;
      continue;
    }
    const heading = parseHeadingLine(lines[index]);
    if (heading) {
      blocks.push(
        `<h${heading.level}>${inlineMarkdownToHtml(heading.text)}</h${heading.level}>`,
      );
      index += 1;
      continue;
    }
    if (/^\s*(?:-{3,}|_{3,}|\*{3,})\s*$/.test(lines[index])) {
      blocks.push("<hr>");
      index += 1;
      continue;
    }
    const firstList = parseListLine(lines[index]);
    if (firstList) {
      const listLines: ParsedListLine[] = [];
      while (index < lines.length) {
        const parsed = parseListLine(lines[index]);
        if (parsed) {
          listLines.push(parsed);
          index += 1;
          continue;
        }
        break;
      }
      let listIndex = 0;
      while (listIndex < listLines.length) {
        const root = listLines[listIndex];
        const rendered = renderList(
          listLines,
          listIndex,
          root.depth,
          root.kind,
        );
        blocks.push(rendered[0]);
        listIndex = rendered[1];
      }
      continue;
    }
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !parseHeadingLine(lines[index]) &&
      !parseListLine(lines[index]) &&
      !/^\s*(?:-{3,}|_{3,}|\*{3,})\s*$/.test(lines[index])
    ) {
      paragraph.push(inlineMarkdownToHtml(lines[index]));
      index += 1;
    }
    blocks.push(`<p>${paragraph.join("<br>")}</p>`);
  }
  return blocks.join("") || "<p></p>";
};

const serializeInline = (node: JSONContent): string => {
  if (node.type === "hardBreak") return "\n";
  if (node.type === "text") {
    let text = node.text ?? "";
    const marks = node.marks ?? [];
    if (marks.some((mark) => mark.type === "bold")) text = `**${text}**`;
    if (marks.some((mark) => mark.type === "italic")) text = `*${text}*`;
    return text;
  }
  return (node.content ?? []).map(serializeInline).join("");
};

const serializeList = (node: JSONContent, depth: number): string[] => {
  const lines: string[] = [];
  const taskList = node.type === "taskList";
  const ordered = node.type === "orderedList" && depth === 0;
  (node.content ?? []).forEach((item, itemIndex) => {
    const paragraph = item.content?.find((child) => child.type === "paragraph");
    const marker = taskList
      ? `- [${item.attrs?.checked ? "x" : " "}]`
      : ordered
        ? `${itemIndex + 1}.`
        : "-";
    lines.push(
      `${"\t".repeat(depth)}${marker} ${paragraph ? serializeInline(paragraph) : ""}`,
    );
    (item.content ?? [])
      .filter((child) =>
        ["bulletList", "orderedList", "taskList"].includes(child.type ?? ""),
      )
      .forEach((child) => lines.push(...serializeList(child, depth + 1)));
  });
  return lines;
};

const tiptapJsonToMarkdown = (json: JSONContent) =>
  (json.content ?? [])
    .flatMap((node) => {
      if (["bulletList", "orderedList", "taskList"].includes(node.type ?? ""))
        return serializeList(node, 0);
      if (node.type === "horizontalRule") return ["---"];
      if (node.type === "heading") {
        const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
        return [`${"#".repeat(level)} ${serializeInline(node)}`];
      }
      return [serializeInline(node)];
    })
    .join("\n")
    .trimEnd();

export {
  inlineMarkdownToHtml,
  markdownToHtml,
  normalizeRichTextValue,
  parseHeadingLine,
  parseListLine,
  tiptapJsonToMarkdown,
};
