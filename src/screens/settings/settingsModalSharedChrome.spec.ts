import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};

const modalStyles = readFileSync(
  join(process.cwd(), "src/screens/modal/Modal.module.css"),
  "utf8",
);
const settingsSource = readFileSync(
  join(process.cwd(), "src/screens/settings/SettingsModal.tsx"),
  "utf8",
);
const settingsStyles = readFileSync(
  join(process.cwd(), "src/screens/settings/SettingsModal.module.css"),
  "utf8",
);

test("settings modal imports shared modal chrome", () => {
  expectEqual(
    settingsSource.includes('import ModalChromeHeader from "../modal/ModalChromeHeader";'),
    true,
  );
  expectEqual(
    settingsSource.includes('import modalStyles from "../modal/Modal.module.css";'),
    true,
  );
});

test("shared modal stylesheet exposes reusable chrome classes", () => {
  expectEqual(modalStyles.includes(".chrome-panel"), true);
  expectEqual(modalStyles.includes(".chrome-header"), true);
  expectEqual(modalStyles.includes(".chrome-title"), true);
  expectEqual(modalStyles.includes(".chrome-close-button"), true);
  expectEqual(modalStyles.includes(".chrome-primary-button"), true);
  expectEqual(modalStyles.includes(".chrome-confirm-button"), true);
});

test("settings modal no longer owns duplicated modal chrome styles", () => {
  expectEqual(settingsStyles.includes(".header {"), false);
  expectEqual(settingsStyles.includes(".close-button {"), false);
  expectEqual(settingsStyles.includes(".primary-button {"), false);
  expectEqual(settingsStyles.includes(".secondary-button {"), false);
  expectEqual(settingsStyles.includes(".danger-button {"), false);
  expectEqual(settingsStyles.includes(".text-input {"), false);
});
