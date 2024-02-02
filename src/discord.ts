import { appConfig, processedEMLogLines, resolveLogLineType } from '.';

export const LOG_BATCH_SIZE = appConfig.compactOutput ? 5 : 10;
export const LOG_DELAY = 2000; // 2 seconds, 30 batches per minute (webhook ratelimit)

const workingBatches: string[][] = [];

export const handleLogLine = (data: string) => {
  console.debug(`[log-tail/watcher] New Content: ${data}`);
  let currBatch = workingBatches[workingBatches.length - 1];

  // Generate hash of line to check if we have processed it
  const hash = Buffer.from(data).toString('base64');
  if (processedEMLogLines.has(hash)) return;
  processedEMLogLines.add(hash);

  // If there is no current batch, create one
  if (!currBatch || currBatch.length >= LOG_BATCH_SIZE) {
    workingBatches.push([]);
    currBatch = workingBatches[workingBatches.length - 1] as string[];
  }

  // Exclude entries
  const lineType = resolveLogLineType(data);
  if (
    data.indexOf('has send a requested') >= 0
    || (appConfig.excludeEnabled && lineType && appConfig.excludeEvents.includes(lineType))
  ) return;

  currBatch.push(data);
};

export const getWorkingBatches = () => workingBatches;

export const takeLatestBatch = () => {
  const batch = workingBatches.shift();
  return batch;
};
