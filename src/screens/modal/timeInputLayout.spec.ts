import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};

const getCssBlock = (source: string, selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(
    new RegExp(`(^|\\n)${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"),
  );

  return match?.[2] ?? "";
};

const modalStyles = readFileSync(
  join(process.cwd(), "src/screens/modal/Modal.module.css"),
  "utf8",
);

test("time input groups keep HH:mm:ss on one line in narrow modal layouts", () => {
  const timeBlock = getCssBlock(modalStyles, ".time");
  const timeInputBlock = getCssBlock(modalStyles, ".time input");

  expectEqual(
    timeBlock.includes(
      "grid-template-columns: minmax(2ch, 1fr) auto minmax(2ch, 1fr) auto minmax(2ch, 1fr);",
    ),
    true,
  );
  expectEqual(timeBlock.includes("white-space: nowrap;"), true);
  expectEqual(timeBlock.includes("width: 100%;"), true);
  expectEqual(timeBlock.includes("max-width: 180px;"), true);
  expectEqual(timeBlock.includes("min-width: max-content;"), true);
  expectEqual(timeInputBlock.includes("min-width: 2ch;"), true);
  expectEqual(timeInputBlock.includes("box-sizing: content-box;"), true);
});
