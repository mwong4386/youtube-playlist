import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(
  join(process.cwd(), "src/screens/modal/ModalChromeHeader.tsx"),
  "utf8",
);

const expectEqual = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};

test("ModalChromeHeader supports variant prop in interface", () => {
  expectEqual(source.includes('variant?: "centered" | "roomy";'), true);
});

test("ModalChromeHeader defaults variant to centered", () => {
  expectEqual(source.includes('variant = "centered"'), true);
});

test("ModalChromeHeader conditionally renders ghosts based on variant", () => {
  expectEqual(source.includes('const isCentered = variant === "centered";'), true);
  expectEqual(source.includes("{isCentered && ("), true);
});
