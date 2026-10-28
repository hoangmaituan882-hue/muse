import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

import { retry } from "es-toolkit/function";
import { build } from "vite-plus";
import { z } from "zod";

const rendererUrl = "http://localhost:5173/";
const root = path.join(import.meta.dirname, "..");
const electron =
  process.env.MUSE_ELECTRON_PATH ?? z.string().parse(createRequire(import.meta.url)("electron"));
let child: ChildProcess | undefined;
let stopping = false;
let pending: ReturnType<typeof setTimeout> | undefined;
let restarting = Promise.resolve();

const stopChild = async () => {
  const previous = child;
  child = undefined;
  if (!previous?.pid || previous.exitCode !== null || previous.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    const force = () => {
      if (process.platform === "win32") {
        const killer = spawn("taskkill", ["/pid", String(previous.pid), "/t", "/f"], {
          windowsHide: true,
          stdio: "ignore",
        });
        killer.once("error", () => {
          previous.kill();
        });
      } else {
        previous.kill();
      }
    };
    const timeout = setTimeout(force, 5000);
    previous.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    // Let Chromium flush the library before replacing the process; force termination is only for a hung app.
    if (previous.connected) {
      previous.send("muse:stop", (error) => {
        if (error) force();
      });
    } else {
      force();
    }
  });
};

const restart = () => {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    restarting = restarting.then(async () => {
      await stopChild();
      if (stopping) return;
      child = spawn(
        electron,
        [".", "--remote-debugging-port=9222", "--remote-debugging-address=127.0.0.1"],
        {
          cwd: root,
          env: { ...process.env, ELECTRON_RENDERER_URL: rendererUrl },
          stdio: ["inherit", "inherit", "inherit", "ipc"],
        },
      );
      child.on("error", (error) => console.error("MUSE could not start:", error));
      console.log("MUSE desktop started. Main/preload changes restart this window automatically.");
    });
  }, 250);
};

await retry(
  async () => {
    const response = await fetch(rendererUrl);
    if (!response.ok) throw new Error(`Waiting for ${rendererUrl}`);
  },
  { delay: 200, retries: 300 },
);

const ready = new Set<string>();
const watchers = await Promise.all(
  ["main", "preload"].map(async (target) => {
    const watcher = await build({
      configFile: path.join(root, `vite.${target}.config.ts`),
      build: { watch: {} },
    });
    if (!("on" in watcher)) throw new Error("Expected a Vite build watcher");
    watcher.on("event", (event) => {
      if (event.code === "START") ready.delete(target);
      if (event.code === "ERROR") {
        ready.delete(target);
        console.error(event.error);
        return;
      }
      if (event.code === "END") {
        ready.add(target);
        if (ready.size === 2) restart();
      }
    });
    return watcher;
  }),
);

const stop = () => {
  stopping = true;
  if (pending) clearTimeout(pending);
  void Promise.all([stopChild(), ...watchers.map((watcher) => watcher.close())]).then(() =>
    process.exit(0),
  );
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
