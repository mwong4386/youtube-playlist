import test from "node:test";
import { runAgentLoop } from "./geminiAgentLoop";
import { registerTool, clearRegistry } from "./geminiAgentRegistry";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

const createResponse = (body: any) => ({
  ok: true,
  status: 200,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

test("runAgentLoop executes tools and returns final response", async () => {
  clearRegistry();

  const mockTool = {
    name: "test_tool",
    description: "A test tool",
    parameters: { type: "object", properties: { arg1: { type: "string" } } },
    execute: async (args: any) => {
      return { result: `Hello ${args.arg1}` };
    },
  };
  registerTool(mockTool);

  const responses = [
    // First turn: model calls tool
    createResponse({
      candidates: [
        {
          content: {
            role: "model",
            parts: [
              {
                functionCall: {
                  name: "test_tool",
                  args: { arg1: "World" },
                },
              },
            ],
          },
        },
      ],
    }),
    // Second turn: model gives final answer
    createResponse({
      candidates: [
        {
          content: {
            role: "model",
            parts: [{ text: "The tool said Hello World" }],
          },
        },
      ],
    }),
  ];

  const originalFetch = global.fetch;
  (global as any).fetch = async () => responses.shift()!;

  try {
    const result = await runAgentLoop("test-key", "Call the test tool");
    expectEqual(result, "The tool said Hello World");
  } finally {
    global.fetch = originalFetch;
  }
});

test("runAgentLoop handles multiple function calls in one turn", async () => {
  clearRegistry();

  registerTool({
    name: "tool1",
    description: "tool 1",
    parameters: { type: "object", properties: {} },
    execute: async () => ({ res: 1 }),
  });
  registerTool({
    name: "tool2",
    description: "tool 2",
    parameters: { type: "object", properties: {} },
    execute: async () => ({ res: 2 }),
  });

  const responses = [
    createResponse({
      candidates: [
        {
          content: {
            role: "model",
            parts: [
              { functionCall: { name: "tool1", args: {} } },
              { functionCall: { name: "tool2", args: {} } },
            ],
          },
        },
      ],
    }),
    createResponse({
      candidates: [
        {
          content: {
            role: "model",
            parts: [{ text: "Done both" }],
          },
        },
      ],
    }),
  ];

  const originalFetch = global.fetch;
  (global as any).fetch = async () => responses.shift()!;

  try {
    const result = await runAgentLoop("test-key", "Run both tools");
    expectEqual(result, "Done both");
  } finally {
    global.fetch = originalFetch;
  }
});
