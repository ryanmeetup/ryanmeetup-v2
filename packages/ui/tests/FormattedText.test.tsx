import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormattedText } from "../src/FormattedText";

describe("FormattedText", () => {
  it("renders Markdown headings as semantic heading elements", () => {
    const markup = renderToStaticMarkup(
      <FormattedText text={"# Test heading\n\nBody text"} />,
    );

    expect(markup).toContain("<h1");
    expect(markup).toContain(">Test heading</span></h1>");
    expect(markup).not.toContain("# Test heading");
  });
});
