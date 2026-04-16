import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};

const contentScriptSource = readFileSync(
  join(process.cwd(), "src/contentScript/index.ts"),
  "utf8"
);

test("bookmark dialog render is flushed before content-script handlers bind to dialog nodes", () => {
  expectEqual(contentScriptSource.includes('from "react-dom"'), true);
  expectEqual(contentScriptSource.includes("flushSync(() =>"), true);
  expectEqual(
    contentScriptSource.includes("render(createElement(BookmarkDialog))"),
    true
  );
});
