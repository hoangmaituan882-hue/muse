import { mkdirSync } from "node:fs";
import path from "node:path";

import { app } from "electron";

export const configureDataPaths = () => {
  const base =
    process.env.MUSE_DATA_DIR ??
    path.join(process.env.PORTABLE_EXECUTABLE_DIR ?? path.dirname(app.getPath("exe")), "MUSE Data");
  for (const [name, folder] of [
    ["appData", "application"],
    ["userData", "library"],
    ["sessionData", "session"],
    ["temp", "temp"],
    ["crashDumps", "crashes"],
    ["logs", "logs"],
  ] as const) {
    const directory = path.join(base, folder);
    mkdirSync(directory, { recursive: true });
    app.setPath(name, directory);
  }
  app.commandLine.appendSwitch("disk-cache-dir", path.join(base, "session", "Cache"));
  return base;
};
