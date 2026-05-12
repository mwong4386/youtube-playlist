import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(
  join(process.cwd(), "src/screens/gemini/GeminiAgentChat.tsx"),
  "utf8",
);

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
};

test("GeminiAgentChat handles message history", () => {
  expectEqual(source.includes("const [history, setHistory] = useState"), true);
  expectEqual(source.includes("setHistory(response.history)"), true);
});

test("GeminiAgentChat communicates with background via MsgType.AgenticChatRequest", () => {
  expectEqual(source.includes("name: MsgType.AgenticChatRequest"), true);
  expectEqual(source.includes("chrome.runtime.sendMessage"), true);
});

test("GeminiAgentChat manages loading state", () => {
  expectEqual(source.includes("const [isLoading, setIsLoading] = useState(false)"), true);
  expectEqual(source.includes("setIsLoading(true)"), true);
  expectEqual(source.includes("setIsLoading(false)"), true);
});

test("GeminiAgentChat renders message bubbles with correct roles", () => {
  expectEqual(source.includes("msg.role.toUpperCase() === \"USER\" ? styles.user : styles.model"), true);
});

test("GeminiAgentChat scrolls to bottom on history change", () => {
  expectEqual(source.includes("chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight"), true);
});
