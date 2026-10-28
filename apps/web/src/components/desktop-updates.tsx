import { useEffect, useState } from "react";

import type { DesktopUpdateState } from "@muse/electron";

export function DesktopUpdates() {
  const [state, setState] = useState<DesktopUpdateState | null>(null);
  const [error, setError] = useState("");
  const api = window.desktop;
  useEffect(() => {
    if (!api) return;
    const unsubscribe = api.onUpdate(setState);
    void api
      .updateState()
      .then(setState)
      .catch(() => setError("无法读取更新状态，请重新打开应用。"));
    return unsubscribe;
  }, [api]);
  if (!api || (!state && !error)) return null;
  const action = (run: () => Promise<void>) => {
    setError("");
    void run().catch(() => setError("操作失败，请重试。"));
  };
  return (
    <div className="setting-row" aria-label="软件更新">
      <span>
        <strong>软件更新 {state?.currentVersion}</strong>
        <small role="status">{error || state?.message}</small>
      </span>
      {state && state.phase !== "disabled" && (
        <button
          className="secondary-button"
          disabled={["checking", "downloading"].includes(state.phase)}
          onClick={() => {
            if (state.phase === "available") action(api.downloadUpdate);
            else if (state.phase === "ready") action(api.installUpdate);
            else action(api.checkUpdate);
          }}
        >
          {state.phase === "available"
            ? "下载更新"
            : state.phase === "ready"
              ? "重启安装"
              : state.phase === "downloading"
                ? `下载中 ${Math.round(state.percent ?? 0)}%`
                : state.phase === "checking"
                  ? "检查中…"
                  : "检查更新"}
        </button>
      )}
    </div>
  );
}
