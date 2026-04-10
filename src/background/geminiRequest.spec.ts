import test from "node:test";
import {
  buildGeminiGenerateContentUrl,
  fetchGeminiGenerateContentWithRetries,
  readGeminiErrorResponse,
} from "./geminiRequest";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

const createResponse = (
  status: number,
  body: string,
  ok = status >= 200 && status < 300
) => {
  return {
    ok,
    status,
    statusText: "",
    json: async () => JSON.parse(body),
    text: async () => body,
  };
};

test("buildGeminiGenerateContentUrl uses v1beta for YouTube URL video input", () => {
  expectEqual(
    buildGeminiGenerateContentUrl("test-key"),
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=test-key"
  );
});

test("readGeminiErrorResponse returns Gemini's API error message", async () => {
  expectEqual(
    await readGeminiErrorResponse(
      createResponse(
        503,
        JSON.stringify({
          error: {
            code: 503,
            message:
              "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
            status: "UNAVAILABLE",
          },
        })
      )
    ),
    {
      message:
        "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
      responseText:
        '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}',
    }
  );
});

test("fetchGeminiGenerateContentWithRetries retries 503 responses before succeeding", async () => {
  const calls: unknown[] = [];
  const waits: number[] = [];
  const responses = [
    createResponse(503, '{"error":{"message":"overloaded"}}', false),
    createResponse(503, '{"error":{"message":"still overloaded"}}', false),
    createResponse(200, '{"candidates":[]}', true),
  ];

  const result = await fetchGeminiGenerateContentWithRetries({
    apiKey: "test-key",
    requestBody: { contents: [] },
    fetcher: async (url, init) => {
      calls.push({ url, init });
      return responses.shift()!;
    },
    wait: async (delayMs) => {
      waits.push(delayMs);
    },
  });

  expectEqual(result.response.ok, true);
  expectEqual(calls.length, 3);
  expectEqual(waits, [1000, 3000]);
});
