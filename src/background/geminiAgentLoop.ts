import {
  fetchGeminiGenerateContentWithRetries,
  readGeminiErrorResponse,
} from "./geminiRequest";
import { getTool, getToolsForGemini } from "./geminiAgentRegistry";

export interface GeminiMessage {
  role: "user" | "model" | "tool";
  parts: Array<
    | { text: string }
    | { functionCall: { name: string; args: any } }
    | { functionResponse: { name: string; response: any } }
  >;
}

export async function runAgentLoop(
  apiKey: string,
  userPrompt: string,
  history: GeminiMessage[] = [],
  signal?: AbortSignal,
): Promise<{ text: string; history: GeminiMessage[] }> {
  const contents: GeminiMessage[] = [
    ...history,
    { role: "user", parts: [{ text: userPrompt }] },
  ];

  const tools = getToolsForGemini();
  const geminiTools =
    tools.length > 0 ? [{ function_declarations: tools }] : undefined;

  let turnCount = 0;
  const maxTurns = 10;

  while (turnCount < maxTurns) {
    turnCount++;

    const requestBody = {
      contents,
      tools: geminiTools,
    };

    const { response } = await fetchGeminiGenerateContentWithRetries({
      apiKey,
      requestBody,
      signal,
    });

    if (!response.ok) {
      const error = await readGeminiErrorResponse(response);
      throw new Error(`Gemini API Error: ${error.message}`);
    }

    const data: any = await response.json();
    const candidate = data.candidates?.[0];
    const message = candidate?.content;

    if (!message) {
      throw new Error("Gemini returned an empty response.");
    }

    contents.push(message);

    const functionCalls = message.parts.filter((part: any) => part.functionCall);

    if (functionCalls.length === 0) {
      // Final response (assuming it has text)
      const textPart = message.parts.find((part: any) => part.text);
      return {
        text: textPart?.text || "I've completed the task.",
        history: contents,
      };
    }

    // Execute function calls
    const functionResponseParts = await Promise.all(
      functionCalls.map(async (part: any) => {
        const { name, args } = part.functionCall;
        const tool = getTool(name);
        if (!tool) {
          return {
            functionResponse: {
              name,
              response: { error: `Tool ${name} not found.` },
            },
          };
        }

        try {
          const result = await tool.execute(args);
          return {
            functionResponse: {
              name,
              response: result,
            },
          };
        } catch (error: any) {
          return {
            functionResponse: {
              name,
              response: { error: error.message || "Unknown error" },
            },
          };
        }
      }),
    );

    contents.push({
      role: "tool",
      parts: functionResponseParts as any,
    });
  }

  throw new Error("Exceeded maximum agent turns.");
}
