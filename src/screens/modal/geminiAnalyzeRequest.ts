type GeminiAnalyzeScope = {
  active: boolean;
  itemId: string | undefined;
  requestToken: number;
};

type GeminiAnalyzeRequest = {
  itemId: string;
  requestToken: number;
};

const shouldApplyAnalyzeResult = (
  scope: GeminiAnalyzeScope,
  request: GeminiAnalyzeRequest
) => {
  return (
    scope.active &&
    scope.itemId === request.itemId &&
    scope.requestToken === request.requestToken
  );
};

export { shouldApplyAnalyzeResult };
export type { GeminiAnalyzeRequest, GeminiAnalyzeScope };
