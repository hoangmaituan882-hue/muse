import type { DesktopApi } from "@muse/electron";

declare global {
  interface Window {
    desktop?: DesktopApi;
  }
}
