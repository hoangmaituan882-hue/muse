import path from "node:path";

import { app, BrowserWindow, session } from "electron";

import { rendererOrigin } from "@muse/electron";

import { defaultApiOrigin } from "#src/main/config.ts";
import { configureDataPaths } from "#src/main/data-paths.ts";
import { setupIpc } from "#src/main/ipc.ts";
import { parseHttpOrigin, parseLoopbackOrigin } from "#src/main/renderer-route.ts";
import { serveRenderer } from "#src/main/renderer.ts";
import { createUpdates } from "#src/main/updates.ts";
import { createMainWindow } from "#src/main/window.ts";

const dataRoot = configureDataPaths();

const origin = (name: string, parse: (value: string) => string | null) => {
  const value = process.env[name];

  if (value === undefined || value === "") {
    return null;
  }

  const parsed = parse(value);

  if (parsed === null) {
    throw new Error(`${name} is not a valid origin: ${value}`);
  }

  return parsed;
};

const devOrigin = origin("ELECTRON_RENDERER_URL", parseLoopbackOrigin);

const apiOrigin = origin("API_ORIGIN", parseHttpOrigin) ?? parseHttpOrigin(defaultApiOrigin);

if (apiOrigin === null) {
  throw new Error(`defaultApiOrigin is not an origin: ${defaultApiOrigin}`);
}

const open = () =>
  createMainWindow({
    devOrigin,
    preload: path.join(import.meta.dirname, "../preload/index.cjs"),
    url: devOrigin ?? `${rendererOrigin}/`,
  });

const start = () => {
  if (devOrigin !== null) {
    process.on("message", (message: unknown) => {
      if (message === "muse:stop") {
        session.defaultSession.flushStorageData();
        app.quit();
      }
    });
  }
  const updates = createUpdates(dataRoot);
  setupIpc(devOrigin, updates);

  if (devOrigin === null) {
    serveRenderer({
      apiOrigin,
      rendererRoot: path.join(import.meta.dirname, "../renderer"),
    });
  }

  open();
  updates.start();
};

if (app.requestSingleInstanceLock()) {
  // No top-level `await`: Electron starts the app only after the main module finishes evaluating.
  app.on("ready", start);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      open();
    }
  });
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
} else {
  app.quit();
}
