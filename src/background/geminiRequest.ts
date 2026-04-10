type GeminiHttpResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

type GeminiFetchInit = {
  method: "POST";
  headers: Record<string, string>;
  body: string;
};

type GeminiFetch = (
  url: string,
  init: GeminiFetchInit,
) => Promise<GeminiHttpResponse>;

type GeminiWait = (delayMs: number) => Promise<void>;

type GeminiFetchWithRetriesOptions = {
  apiKey: string;
  requestBody: unknown;
  fetcher?: GeminiFetch;
  wait?: GeminiWait;
  retryDelaysMs?: number[];
};

type GeminiErrorResponse = {
  message: string;
  responseText: string;
};

const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_RETRY_DELAYS_MS = [1000, 3000];
const GEMINI_GENERIC_FAILURE_MESSAGE =
  "Gemini could not analyze this song right now.";

const wait = (delayMs: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
};

const buildGeminiGenerateContentUrl = (apiKey: string) => {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
};

const readGeminiErrorResponse = async (
  response: GeminiHttpResponse,
): Promise<GeminiErrorResponse> => {
  const responseText = await response.text();

  try {
    const payload = JSON.parse(responseText);
    const message = payload?.error?.message;

    if (typeof message === "string" && message.trim()) {
      return {
        message: message.trim(),
        responseText,
      };
    }
  } catch {
    // Keep the original response text for diagnostics below.
  }

  return {
    message: GEMINI_GENERIC_FAILURE_MESSAGE,
    responseText,
  };
};

const isRetryableGeminiResponse = (response: GeminiHttpResponse) => {
  return response.status === 503;
};

const fetchGeminiGenerateContentWithRetries = async ({
  apiKey,
  requestBody,
  fetcher = fetch as GeminiFetch,
  wait: waitForRetry = wait,
  retryDelaysMs = GEMINI_RETRY_DELAYS_MS,
}: GeminiFetchWithRetriesOptions) => {
  const url = buildGeminiGenerateContentUrl(apiKey);

  for (let attemptIndex = 0; attemptIndex <= retryDelaysMs.length; attemptIndex += 1) {
    const response = await fetcher(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok || !isRetryableGeminiResponse(response)) {
      return {
        response,
        attempt: attemptIndex + 1,
      };
    }

    const retryDelayMs = retryDelaysMs[attemptIndex];
    if (typeof retryDelayMs === "undefined") {
      return {
        response,
        attempt: attemptIndex + 1,
      };
    }

    await waitForRetry(retryDelayMs);
  }

  throw new Error("Gemini retry loop exhausted without a response.");
};

export {
  buildGeminiGenerateContentUrl,
  fetchGeminiGenerateContentWithRetries,
  readGeminiErrorResponse,
  GEMINI_GENERIC_FAILURE_MESSAGE,
  GEMINI_RETRY_DELAYS_MS,
};
export type { GeminiFetch, GeminiHttpResponse };
