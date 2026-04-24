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

test("bookmark button adds directly to the active song list instead of opening the dialog", () => {
  expectEqual(
    contentScriptSource.includes(
      'bookmarkBtn.addEventListener("click", onCSQuickAddClickHandler)'
    ),
    true
  );
  expectEqual(
    contentScriptSource.includes(
      'state === "success" ? "Added to song list" : "Click to add to song list"'
    ),
    true
  );
  expectEqual(
    contentScriptSource.includes(
      'state === "success" ? "Added to song list" : "Add to song list"'
    ),
    true
  );
});
