import { describe, expect, it } from "vitest";
import {
  markdownToHtml,
  parseHeadingLine,
  tiptapJsonToMarkdown,
} from "../src/richTextMarkdown";

describe("rich text Markdown", () => {
  it("parses ATX headings at every supported level", () => {
    expect(parseHeadingLine("# Test heading")).toEqual({
      level: 1,
      text: "Test heading",
    });
    expect(parseHeadingLine("###### Small heading")).toEqual({
      level: 6,
      text: "Small heading",
    });
    expect(markdownToHtml("# Test heading")).toBe("<h1>Test heading</h1>");
  });

  it("serializes heading nodes back to Markdown", () => {
    expect(
      tiptapJsonToMarkdown({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Other notes" }],
          },
        ],
      }),
    ).toBe("## Other notes");
  });

  it("keeps intentional blank lines as empty editor paragraphs", () => {
    const markdown = "First paragraph\n\n# Other notes";
    expect(markdownToHtml(markdown)).toBe(
      "<p>First paragraph</p><p><br></p><h1>Other notes</h1>",
    );
    expect(
      tiptapJsonToMarkdown({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "First paragraph" }],
          },
          { type: "paragraph" },
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Other notes" }],
          },
        ],
      }),
    ).toBe(markdown);
  });

  it("does not collapse blank lines between list blocks", () => {
    expect(markdownToHtml("- First item\n\n- Second item")).toBe(
      "<ul><li><p>First item</p></li></ul><p><br></p><ul><li><p>Second item</p></li></ul>",
    );
  });
});
