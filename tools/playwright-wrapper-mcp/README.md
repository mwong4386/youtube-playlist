# Playwright Wrapper MCP

This is a restricted MCP server that wraps Playwright instead of exposing raw browser control.

## What it enforces

- Brave only
- disposable browser profile only
- unpacked extension loaded from `build/`
- allowlisted navigation only
- no `file://` access
- no downloads by default

## Allowed URLs

- `https://youtube.com/*`
- `https://www.youtube.com/*`
- `chrome-extension://*`

## Exposed MCP tools

- `start_session`
- `goto`
- `click`
- `type`
- `upload_file`
- `press`
- `wait_for`
- `read_text`
- `screenshot`
- `close_session`

## Important setup rule

Register this wrapper MCP in Codex, and do not expose a raw Playwright MCP server alongside it. If both are available, the wrapper boundary can be bypassed.

## File upload boundary

- `upload_file` is restricted to files inside this repository.
- This supports extension import flows without granting access to arbitrary paths outside the project.

## Environment variables

- `BRAVE_EXECUTABLE_PATH`
  Defaults to `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
- `EXTENSION_BUILD_PATH`
  Defaults to this repo's `build/`

## Local run

Install dependencies inside this folder, then run:

```bash
npm install
npm start
```

## Example Codex MCP registration

The exact registration command depends on how you want to manage Codex config, but the server command itself is:

```bash
node /Users/matthewwong/Documents/Projects/youtube-playlist/youtube-playlist/tools/playwright-wrapper-mcp/src/index.js
```

Keep the raw Playwright MCP unregistered. Only expose this wrapper.
