import { z } from "zod";

export const desktopBridgeGlobal = "desktop";

// https, because clients such as Better Auth accept only http and https origins.
export const rendererHost = "app.localhost";
export const rendererOrigin = `https://${rendererHost}`;

export const desktopChannels = {
  versions: "desktop:versions",
  updateState: "desktop:update-state",
  checkUpdate: "desktop:check-update",
  downloadUpdate: "desktop:download-update",
  installUpdate: "desktop:install-update",
  updateChanged: "desktop:update-changed",
} as const;

export const updateStateSchema = z.object({
  phase: z.enum([
    "disabled",
    "idle",
    "checking",
    "current",
    "available",
    "downloading",
    "ready",
    "error",
  ]),
  currentVersion: z.string(),
  message: z.string(),
  version: z.string().optional(),
  percent: z.number().min(0).max(100).optional(),
});
export type DesktopUpdateState = z.infer<typeof updateStateSchema>;

export const versionsSchema = z.object({
  app: z.string(),
  chrome: z.string(),
  electron: z.string(),
  node: z.string(),
});

export type DesktopVersions = z.infer<typeof versionsSchema>;

export interface DesktopApi {
  versions: () => Promise<DesktopVersions>;
  updateState: () => Promise<DesktopUpdateState>;
  checkUpdate: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdate: (listener: (state: DesktopUpdateState) => void) => () => void;
}
