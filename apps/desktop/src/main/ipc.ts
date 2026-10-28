import { app, ipcMain } from "electron";

import { desktopChannels } from "@muse/electron";
import type { DesktopVersions } from "@muse/electron";

import { isTrustedUrl } from "#src/main/renderer-route.ts";
import type { DesktopUpdates } from "#src/main/updates.ts";

const versions = (): DesktopVersions => ({
  app: app.getVersion(),
  chrome: process.versions.chrome,
  electron: process.versions.electron,
  node: process.versions.node,
});

/** Every channel goes through here: a handler answers only frames the app itself loaded. */
export const setupIpc = (devOrigin: string | null, updates: DesktopUpdates) => {
  ipcMain.handle(desktopChannels.versions, (event) => {
    if (!isTrustedUrl(event.senderFrame?.url ?? "", devOrigin)) {
      throw new Error("Untrusted IPC sender");
    }

    return versions();
  });
  for (const [channel, handler] of [
    [desktopChannels.updateState, updates.state],
    [desktopChannels.checkUpdate, updates.check],
    [desktopChannels.downloadUpdate, updates.download],
    [desktopChannels.installUpdate, updates.install],
  ] as const) {
    ipcMain.handle(channel, (event) => {
      if (!isTrustedUrl(event.senderFrame?.url ?? "", devOrigin))
        throw new Error("Untrusted IPC sender");
      return handler();
    });
  }
};
