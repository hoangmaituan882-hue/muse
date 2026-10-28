import path from "node:path";

import { app, BrowserWindow } from "electron";
import { NsisUpdater } from "electron-updater";

import { desktopChannels } from "@muse/electron";
import type { DesktopUpdateState } from "@muse/electron";

export const createUpdates = (dataRoot: string) => {
  const disabled =
    !app.isPackaged || process.platform !== "win32" || Boolean(process.env.PORTABLE_EXECUTABLE_DIR);
  let state: DesktopUpdateState = {
    phase: disabled ? "disabled" : "idle",
    currentVersion: app.getVersion(),
    message: !app.isPackaged
      ? "实时开发版：界面自动刷新，桌面代码修改后自动重启。"
      : disabled
        ? "免安装版请从 GitHub Releases 下载新版；安装版支持自动更新。"
        : "启动后自动检查新版本。",
  };
  const publish = (next: Omit<DesktopUpdateState, "currentVersion">) => {
    state = { ...next, currentVersion: app.getVersion() };
    for (const window of BrowserWindow.getAllWindows())
      window.webContents.send(desktopChannels.updateChanged, state);
  };
  const updater = disabled
    ? null
    : new NsisUpdater(undefined, {
        version: app.getVersion(),
        name: app.getName(),
        isPackaged: app.isPackaged,
        appUpdateConfigPath: path.join(process.resourcesPath, "app-update.yml"),
        userDataPath: app.getPath("userData"),
        baseCachePath: path.join(dataRoot, "updates"),
        whenReady: () => app.whenReady(),
        quit: () => app.quit(),
        relaunch: () => app.relaunch(),
        onQuit: (handler) => {
          app.once("quit", (_event, code) => handler(code));
        },
      });

  if (updater) {
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowDowngrade = false;
    updater.on("checking-for-update", () =>
      publish({ phase: "checking", message: "正在检查新版本…" }),
    );
    updater.on("update-not-available", () =>
      publish({ phase: "current", message: "已是最新版本。" }),
    );
    updater.on("update-available", (info) =>
      publish({ phase: "available", version: info.version, message: `发现新版本 ${info.version}` }),
    );
    updater.on("download-progress", (progress) =>
      publish({
        phase: "downloading",
        percent: Math.min(100, Math.max(0, progress.percent)),
        message: `正在下载 ${Math.round(progress.percent)}%`,
      }),
    );
    updater.on("update-downloaded", (info) =>
      publish({ phase: "ready", version: info.version, message: "下载完成，重启即可安装。" }),
    );
    updater.on("error", (error) => {
      console.error("Update failed:", error);
      publish({ phase: "error", message: "暂时无法更新，请检查网络后重试。" });
    });
  }

  const check = async () => {
    if (!updater || ["checking", "downloading", "ready"].includes(state.phase)) return;
    try {
      await updater.checkForUpdates();
    } catch {
      /* The updater error event reports recoverable network failures. */
    }
  };
  return {
    state: () => state,
    check,
    download: async () => {
      if (!updater || state.phase !== "available") return;
      publish({ phase: "downloading", percent: 0, message: "准备下载…" });
      try {
        await updater.downloadUpdate();
      } catch {
        /* The updater error event reports download failures. */
      }
    },
    install: () => {
      if (updater && state.phase === "ready") updater.quitAndInstall(false, true);
    },
    start: () => {
      if (!updater) return;
      const first = setTimeout(() => {
        void check();
      }, 5000);
      const repeated = setInterval(
        () => {
          void check();
        },
        6 * 60 * 60 * 1000,
      );
      first.unref();
      repeated.unref();
      app.once("before-quit", () => {
        clearTimeout(first);
        clearInterval(repeated);
      });
    },
  };
};
export type DesktopUpdates = ReturnType<typeof createUpdates>;
