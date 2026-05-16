import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { highlightText } from "~/popup-react/utils";

it("keeps repeated matched text in the title", () => {
  const rendered = renderToStaticMarkup(
    <>{highlightText("Sign in to GitHub · GitHub", /Git/iu)}</>,
  );

  expect(rendered).toContain("Sign in to ");
  expect(rendered).toContain("Hub · ");
  expect(rendered).toContain(">Git<");
  expect(rendered).toContain("GitHub · GitHub");
});
