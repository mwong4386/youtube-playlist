import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(
  join(process.cwd(), "src/screens/gemini/GeminiSettingsModal.tsx"),
  "utf8",
);

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
};

test("GeminiSettingsModal integrates GeminiAgentChat", () => {
  expectEqual(source.includes("import GeminiAgentChat from \"./GeminiAgentChat\""), true);
  expectEqual(source.includes("<GeminiAgentChat />"), true);
});

test("GeminiSettingsModal has a toggle for experimental chat", () => {
  expectEqual(source.includes("const [showChat, setShowChat] = useState(false)"), true);
  expectEqual(source.includes("Try Experimental Agentic Chat"), true);
  expectEqual(source.includes("onClick={() => setShowChat(true)}"), true);
});

test("GeminiSettingsModal resets chat state when closed", () => {
  expectEqual(source.includes("setShowChat(false)"), true);
});

test("GeminiSettingsModal updates header title based on chat visibility", () => {
  expectEqual(source.includes("title={showChat ? \"Gemini Agent Chat\" : \"Setup Gemini\"}"), true);
});
