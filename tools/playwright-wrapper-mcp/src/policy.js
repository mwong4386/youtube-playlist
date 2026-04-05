function normalizeHost(hostname) {
  return hostname.toLowerCase();
}

export function isAllowedUrl(rawUrl, config) {
  let parsed;

  try {
    parsed = new URL(rawUrl);
  } catch {
    return {
      allowed: false,
      reason: `Invalid URL: ${rawUrl}`,
    };
  }

  if (parsed.protocol === "chrome-extension:") {
    return config.allowChromeExtensionProtocol
      ? { allowed: true }
      : { allowed: false, reason: "chrome-extension:// URLs are blocked" };
  }

  if (parsed.protocol === "file:") {
    return config.allowFileProtocol
      ? { allowed: true }
      : { allowed: false, reason: "file:// URLs are blocked" };
  }

  if (parsed.protocol !== "https:") {
    return {
      allowed: false,
      reason: `Only https:// URLs are allowed, received ${parsed.protocol}`,
    };
  }

  const host = normalizeHost(parsed.hostname);
  if (!config.allowedHosts.has(host)) {
    return {
      allowed: false,
      reason: `Host not allowlisted: ${host}`,
    };
  }

  return { allowed: true };
}

export function assertAllowedUrl(rawUrl, config) {
  const decision = isAllowedUrl(rawUrl, config);
  if (!decision.allowed) {
    throw new Error(`Blocked by browser policy: ${decision.reason}`);
  }
}

export function assertAllowedCurrentPage(page, config) {
  const currentUrl = page.url();
  assertAllowedUrl(currentUrl, config);
}
