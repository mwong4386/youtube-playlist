import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const expectIncludes = (content: string, expected: string) => {
  if (!content.includes(expected)) {
    throw new Error(`Expected CSS to include ${JSON.stringify(expected)}`);
  }
};

test("app typography exposes playlist-style shared tokens", () => {
  const indexCss = readFileSync(join(process.cwd(), "src/index.css"), "utf8");
  const appCss = readFileSync(join(process.cwd(), "src/App.css"), "utf8");

  expectIncludes(indexCss, "--app-font-family:");
  expectIncludes(indexCss, "--app-heading-weight: 800;");
  expectIncludes(indexCss, "--app-control-weight: 600;");
  expectIncludes(indexCss, "--app-control-letter-spacing: 0.03em;");
  expectIncludes(indexCss, "--app-meta-letter-spacing: 0.06em;");
  expectIncludes(appCss, "font-family: var(--app-font-family);");
  expectIncludes(appCss, ".App button");
});
