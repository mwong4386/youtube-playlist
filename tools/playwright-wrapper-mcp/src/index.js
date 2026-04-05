import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getConfig } from "./config.js";
import {
  assertAllowedCurrentPage,
  assertAllowedFilePath,
  assertAllowedUrl,
} from "./policy.js";

const config = getConfig();
const sessions = new Map();

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Unknown session: ${sessionId}`);
  }
  return session;
}

async function createSession() {
  if (!fs.existsSync(config.braveExecutablePath)) {
    throw new Error(
      `Brave executable not found at ${config.braveExecutablePath}`
    );
  }

  if (!fs.existsSync(config.extensionPath)) {
    throw new Error(`Extension build path not found at ${config.extensionPath}`);
  }

  const sessionId = randomUUID();
  const userDataDir = await fsPromises.mkdtemp(
    path.join(os.tmpdir(), "yt-playlist-wrapper-")
  );

  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: config.braveExecutablePath,
    headless: false,
    acceptDownloads: config.allowDownloads,
    args: [
      `--disable-extensions-except=${config.extensionPath}`,
      `--load-extension=${config.extensionPath}`,
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  const serviceWorker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const extensionId = new URL(serviceWorker.url()).host;

  const session = {
    id: sessionId,
    context,
    userDataDir,
    extensionId,
  };

  sessions.set(sessionId, session);
  return session;
}

async function closeSession(sessionId) {
  const session = getSession(sessionId);
  await session.context.close();
  await fsPromises.rm(session.userDataDir, { recursive: true, force: true });
  sessions.delete(sessionId);
}

async function getActivePage(session) {
  const existingPage = session.context.pages().find((page) => !page.isClosed());
  if (existingPage) {
    return existingPage;
  }

  return session.context.newPage();
}

function textResult(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

const server = new Server(
  {
    name: "playwright-wrapper-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "start_session",
        description:
          "Launch Brave with a disposable profile and the unpacked extension loaded.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "goto",
        description: "Navigate the active page to an allowlisted URL only.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            url: { type: "string" },
          },
          required: ["session_id", "url"],
        },
      },
      {
        name: "click",
        description: "Click an element on the current allowlisted page.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            selector: { type: "string" },
          },
          required: ["session_id", "selector"],
        },
      },
      {
        name: "type",
        description: "Fill an input on the current allowlisted page.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            selector: { type: "string" },
            text: { type: "string" },
          },
          required: ["session_id", "selector", "text"],
        },
      },
      {
        name: "upload_file",
        description:
          "Attach a local file from inside the project workspace to a file input on the current allowlisted page.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            selector: { type: "string" },
            file_path: { type: "string" },
          },
          required: ["session_id", "selector", "file_path"],
        },
      },
      {
        name: "press",
        description: "Press a keyboard key against a selector on the current page.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            selector: { type: "string" },
            key: { type: "string" },
          },
          required: ["session_id", "selector", "key"],
        },
      },
      {
        name: "wait_for",
        description: "Wait for a selector on the current allowlisted page.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            selector: { type: "string" },
            timeout_ms: { type: "number" },
          },
          required: ["session_id", "selector"],
        },
      },
      {
        name: "read_text",
        description: "Read text content from the current allowlisted page.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            selector: { type: "string" },
          },
          required: ["session_id", "selector"],
        },
      },
      {
        name: "screenshot",
        description: "Capture a screenshot of the current allowlisted page.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string" },
          },
          required: ["session_id"],
        },
      },
      {
        name: "close_session",
        description: "Close Brave and delete the disposable test profile.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string" },
          },
          required: ["session_id"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  if (name === "start_session") {
    const session = await createSession();
    return textResult({
      session_id: session.id,
      browser: config.browserName,
      extension_id: session.extensionId,
      extension_url: `chrome-extension://${session.extensionId}/index.html`,
      policy: {
        hosts: [...config.allowedHosts],
        allow_chrome_extension_protocol: config.allowChromeExtensionProtocol,
        allow_downloads: config.allowDownloads,
      },
    });
  }

  if (name === "close_session") {
    await closeSession(args.session_id);
    return textResult({ closed: true, session_id: args.session_id });
  }

  const session = getSession(args.session_id);
  const page = await getActivePage(session);

  if (name === "goto") {
    assertAllowedUrl(args.url, config);
    await page.goto(args.url, { waitUntil: "domcontentloaded" });
    return textResult({ url: page.url(), title: await page.title() });
  }

  assertAllowedCurrentPage(page, config);

  if (name === "click") {
    await page.locator(args.selector).click();
    return textResult({ clicked: args.selector, url: page.url() });
  }

  if (name === "type") {
    await page.locator(args.selector).fill(args.text);
    return textResult({ filled: args.selector, url: page.url() });
  }

  if (name === "upload_file") {
    assertAllowedFilePath(args.file_path, config);
    if (!fs.existsSync(args.file_path)) {
      throw new Error(`Local file not found: ${args.file_path}`);
    }
    await page.locator(args.selector).setInputFiles(args.file_path);
    return textResult({
      uploaded: args.file_path,
      selector: args.selector,
      url: page.url(),
    });
  }

  if (name === "press") {
    await page.locator(args.selector).press(args.key);
    return textResult({ pressed: args.key, selector: args.selector });
  }

  if (name === "wait_for") {
    await page
      .locator(args.selector)
      .waitFor({ timeout: args.timeout_ms ?? 10_000 });
    return textResult({ found: args.selector, url: page.url() });
  }

  if (name === "read_text") {
    const text = await page.locator(args.selector).innerText();
    return textResult({ selector: args.selector, text });
  }

  if (name === "screenshot") {
    const outputPath = path.join(
      session.userDataDir,
      `screenshot-${Date.now()}.png`
    );
    await page.screenshot({ path: outputPath, fullPage: true });
    return textResult({ screenshot_path: outputPath, url: page.url() });
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
