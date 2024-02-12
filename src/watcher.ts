import { existsSync } from 'fs';
import { stat } from 'fs/promises';
import { Tail } from 'tail';
import { findNewestFile } from '.';

const tag = '[log-tail/watcher]';

export const initFileWatcher = async (
  targetPath: string,
  callback: (data: string) => void | Promise<void>,
  errCallback?: (err: Error) => void | Promise<void>,
  extension?: string | null,
  skipLatestN = 0,
  fileNamePattern?: string
) => {
  if (!existsSync(targetPath)) {
    console.error(`${tag} File does not exist (path "${targetPath}")`);
    throw new Error(`File does not exist (path "${targetPath}")`);
  }

  const targetStats = await stat(targetPath);
  const isDirectory = targetStats.isDirectory();
  let filePath = targetPath;
  if (isDirectory) {
    const newestFilePath = await findNewestFile(filePath, skipLatestN, extension, fileNamePattern);
    if (!newestFilePath) return null;
    filePath = newestFilePath;
  }

  console.debug(`${tag} Creating file watcher for "${filePath}"`);

  let tail;
  try {
    tail = new Tail(filePath);
  } catch (err) {
    console.error(`${tag} Failed to create Tail instance (file missing or invalid, path "${filePath}"): ${err}`);
    return null;
  }
  tail.on('line', callback);
  tail.on('error', (err) => {
    if (errCallback) errCallback(err);
    else console.error(`${tag} Tail error (add an error callback to suppress this): ${err}`);
  });
  tail.watch();
  return {
    tail,
    filePath,
  };
};

export const stopFileWatcher = (tail: Tail) => tail.unwatch();
