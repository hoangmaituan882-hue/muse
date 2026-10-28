import { contextBridge, ipcRenderer } from "electron";

import type { DesktopApi } from "@muse/electron";
import {
  desktopBridgeGlobal,
  desktopChannels,
  updateStateSchema,
  versionsSchema,
} from "@muse/electron";

const desktop: DesktopApi = {
  versions: async () => versionsSchema.parse(await ipcRenderer.invoke(desktopChannels.versions)),
  updateState: async () =>
    updateStateSchema.parse(await ipcRenderer.invoke(desktopChannels.updateState)),
  checkUpdate: async () => {
    await ipcRenderer.invoke(desktopChannels.checkUpdate);
  },
  downloadUpdate: async () => {
    await ipcRenderer.invoke(desktopChannels.downloadUpdate);
  },
  installUpdate: async () => {
    await ipcRenderer.invoke(desktopChannels.installUpdate);
  },
  onUpdate: (listener) => {
    const receive = (_event: Electron.IpcRendererEvent, value: unknown) =>
      listener(updateStateSchema.parse(value));
    ipcRenderer.on(desktopChannels.updateChanged, receive);
    return () => {
      ipcRenderer.removeListener(desktopChannels.updateChanged, receive);
    };
  },
};

contextBridge.exposeInMainWorld(desktopBridgeGlobal, desktop);
