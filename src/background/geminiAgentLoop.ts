import {
  fetchGeminiGenerateContentWithRetries,
  readGeminiErrorResponse,
} from "./geminiRequest";
import { getTool, getToolsForGemini } from "./geminiAgentRegistry";

export interface GeminiMessage {
  role: "USER" | "MODEL" | "ASSISTANT";
  parts: Array<
    | { text: string }
    | { functionCall: { name: string; args: any; id?: string } }
    | { functionResponse: { name: string; response: any; id?: string } }
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
    { role: "USER", parts: [{ text: userPrompt }] },
  ];

  const tools = getToolsForGemini();
  const geminiTools =
    tools.length > 0 ? [{ function_declarations: tools }] : undefined;

  let turnCount = 0;
  const maxTurns = 10;

  while (turnCount < maxTurns) {
    turnCount++;

    const requestBody = {
      system_instruction: {
        parts: [
          {
            text: [
              "You are an intelligent YouTube Playlist management assistant. Your goal is to help users manage their music while being mindful of execution time and API rate limits.",
              "",
              "**Guiding Principles:**",
              "- **Efficiency:** Analyzing individual videos is slow and consumes significant quota. Consider the scale of the user's request.",
              "- **Scale:** For single songs or very small batches (e.g., 1-3 songs), individual deep analysis is appropriate. For large tasks (e.g., an entire playlist), individual analysis will likely fail due to rate limits.",
              "- **Fluidity:** You have multiple tools at your disposal (e.g., generating global profiles, applying profiles, analyzing individual songs). Combine them creatively to solve the user's problem efficiently.",
              "- **Collaboration:** If a user requests a highly inefficient action, it is acceptable to push back, explain the limitations, or propose a faster alternative.",
              "",
              "**Example Scenario:** If a user asks to 'tune the whole playlist for vocals', analyzing 50 videos individually is too slow. A better approach might be to generate a single 'Vocal Focus' EQ profile and apply it to the playlist.",
            ].join("\n"),
          },
        ],
      },
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

    // Force role to uppercase if present
    if (message.role) {
      message.role = message.role.toUpperCase();
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

    // Execute function calls sequentially to avoid race conditions in tool-based storage updates
    const functionResponseParts = [];
    for (const part of functionCalls) {
      const { name, args, id } = part.functionCall;
      const tool = getTool(name);
      if (!tool) {
        functionResponseParts.push({
          functionResponse: {
            name,
            response: { error: `Tool ${name} not found.` },
            id,
          },
        });
        continue;
      }

      try {
        const result = await tool.execute(args);
        functionResponseParts.push({
          functionResponse: {
            name,
            response: result,
            id,
          },
        });
      } catch (error: any) {
        functionResponseParts.push({
          functionResponse: {
            name,
            response: { error: error.message || "Unknown error" },
            id,
          },
        });
      }
    }

    contents.push({
      role: "USER",
      parts: functionResponseParts as any,
    });
  }

  throw new Error("Exceeded maximum agent turns.");
}
