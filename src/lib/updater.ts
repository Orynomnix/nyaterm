import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

export type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "error";

export interface UpdateProgress {
  downloaded: number;
  total: number;
}

export interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
}

let cachedUpdate: Update | null = null;

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const update = await check();
  if (!update) return null;

  cachedUpdate = update;
  return {
    version: update.version,
    date: update.date,
    body: update.body,
  };
}

export async function downloadAndInstallUpdate(
  onProgress?: (progress: UpdateProgress) => void,
): Promise<void> {
  if (!cachedUpdate) throw new Error("No update available");

  let downloaded = 0;
  let total = 0;

  await cachedUpdate.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength ?? 0;
        onProgress?.({ downloaded: 0, total });
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        onProgress?.({ downloaded, total });
        break;
      case "Finished":
        onProgress?.({ downloaded: total, total });
        break;
    }
  });
}

export async function relaunchApp(): Promise<void> {
  await relaunch();
}
