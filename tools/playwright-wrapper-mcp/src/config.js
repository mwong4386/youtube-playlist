import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const repoRoot = path.resolve(currentDir, "..", "..", "..");
const defaultExtensionPath = path.join(repoRoot, "build");
const defaultBravePath =
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

export function getConfig() {
  return {
    browserName: "Brave",
    braveExecutablePath:
      process.env.BRAVE_EXECUTABLE_PATH || defaultBravePath,
    extensionPath: process.env.EXTENSION_BUILD_PATH || defaultExtensionPath,
    allowedFileRoot: repoRoot,
    allowedHosts: new Set(["youtube.com", "www.youtube.com"]),
    allowChromeExtensionProtocol: true,
    allowFileProtocol: false,
    allowDownloads: false,
  };
}
