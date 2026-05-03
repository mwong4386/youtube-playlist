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

test("settings modal uses one modal shell for the profile list and editor", () => {
  const modalShells = settingsSource.match(/<Modal active=/g) || [];

  expectEqual(modalShells.length, 1);
});

test("profile editor header uses a back affordance instead of close chrome", () => {
  expectEqual(settingsSource.includes("import { BackIcon } from \"../icons\";"), true);
  expectEqual(settingsSource.includes("closeIcon={<BackIcon />}"), true);
});

test("create profile view groups Gemini chat with manual tuning", () => {
  expectEqual(settingsSource.includes("GeminiEqProfileBuilder"), true);
  expectEqual(settingsSource.includes("requestGeminiEqProfile"), true);
  expectEqual(settingsSource.includes("Manual tuning"), true);
  expectEqual(settingsSource.includes('embedded={true}'), true);
});

test("create profile view injects Gemini previews into manual tuning", () => {
  expectEqual(settingsSource.includes("previewGeminiProfile"), true);
  expectEqual(settingsSource.includes("onPreviewProfile={previewGeminiProfile}"), true);
  expectEqual(settingsSource.includes("setProfileForm({"), true);
});

test("shared modal header renders a close icon by default", () => {
  const modalHeaderSource = readFileSync(
    join(process.cwd(), "src/screens/modal/ModalChromeHeader.tsx"),
    "utf8",
  );

  expectEqual(modalHeaderSource.includes("import { CloseIcon } from \"../icons\";"), true);
  expectEqual(modalHeaderSource.includes("{closeIcon || <CloseIcon />}"), true);
});
