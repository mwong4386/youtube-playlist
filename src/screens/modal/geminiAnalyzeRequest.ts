type GeminiAnalyzeScope = {
  active: boolean;
  itemId: string | undefined;
  requestToken: number;
};

type GeminiAnalyzeRequest = {
  itemId: string;
  requestToken: number;
};

const syncAnalyzeScope = (
  scope: GeminiAnalyzeScope,
  active: boolean,
  itemId: string | undefined
): GeminiAnalyzeScope => {
  return {
    active,
    itemId,
    requestToken: scope.requestToken + 1,
  };
};

const beginAnalyzeRequest = (
  scope: GeminiAnalyzeScope,
  itemId: string
) => {
  const request = {
    itemId,
    requestToken: scope.requestToken + 1,
  };

  return {
    request,
    scope: {
      active: true,
      itemId,
      requestToken: request.requestToken,
    },
  };
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

export { beginAnalyzeRequest, shouldApplyAnalyzeResult, syncAnalyzeScope };
export type { GeminiAnalyzeRequest, GeminiAnalyzeScope };
