import os from "node:os";
import path from "node:path";

export const FAIRYTALE_PROJECT_DIR = (): string => {
  switch (process.platform) {
    case "win32":
      return path.join(
        os.homedir(),
        "AppData",
        "Roaming",
        "yt-shorts-generator-3",
        "fairytale-projects-3"
      );
    case "darwin":
      return path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "yt-shorts-generator-3",
        "fairytale-projects-3"
      );
    default:
      throw new Error("Unsupported platform");
  }
};
