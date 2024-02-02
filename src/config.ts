import { LOG_DELAY, appConfig, findNewestFile, handleLogLine, initFileWatcher, takeLatestBatch } from '.';
import { EmbedBuilder, HexColorString, WebhookClient, resolveColor } from 'discord.js';

const tag = `[log-tail/${appConfig.moduleName}]`;

export const processedEMLogLines = new Set<string>();

export const initLogFileWatcher = async () => {
  let { tail, filePath } = await initFileWatcher(
    appConfig.logFolderPath,
    handleLogLine,
    undefined,
    appConfig.extension,
    0,
    appConfig.fileNamePattern
  );

  const webhook = new WebhookClient({ url: appConfig.webhookURL });
  setInterval(() => {
    console.debug(`${tag} Checking for new batch to process`);
    const batch = takeLatestBatch();
    if (!batch || !batch.length) {
      console.debug(`${tag} No new batch to process`);
      return;
    }
    processLogBatch(batch, webhook);
  }, LOG_DELAY);

  setInterval(async () => {
    const newestFilePath = await findNewestFile(
      appConfig.logFolderPath,
      0,
      appConfig.extension,
      appConfig.fileNamePattern
    );
    if (newestFilePath === filePath) return;
    console.debug(`${tag} New file detected, switching to "${newestFilePath}"`);
    tail.unwatch();
    processedEMLogLines.clear();
    ({ tail, filePath } = await initFileWatcher(
      appConfig.logFolderPath,
      handleLogLine,
      undefined,
      appConfig.extension,
      0,
      appConfig.fileNamePattern
    ));
  }, LOG_DELAY * 10);
};

export const processLogBatch = (batch: string[], webhook: WebhookClient) => {
  console.debug(`${tag} Processing batch of ${batch.length} lines`);

  if (appConfig.compactOutput) {
    const output = batch.map(resolveOutputForLogLine).join('\n\n');
    if (output === '') return;
    webhook.send(output);
    return;
  }

  const output = batch.map(resolveOutputForLogLine).filter((e) => e !== '');
  if (output.length === 0) return;

  if (!appConfig.themeColor.startsWith('#')) {
    console.warn(`${tag} Invalid themeColor "${appConfig.themeColor}"`);
  }

  webhook.send({
    embeds: output.map((line) => new EmbedBuilder()
      .setColor(resolveColor(appConfig.themeColor as HexColorString))
      .setDescription(line)
    ),
  });
};

export const IS_BEING_DELETED = 'IS_BEING_DELETED';
export const INITIALIZED = 'INITIALIZED';
export const ENTERED = 'ENTERED';
export const UNLOCKED = 'UNLOCKED';
export const STARTED = 'STARTED';
export const LOCKED = 'LOCKED';
export const STOPPED = 'STOPPED';
export const ASSIGNED_NEW_OWNER = 'ASSIGNED_NEW_OWNER';

export const logTypeRegex = {
  [IS_BEING_DELETED]: new RegExp(/ is being deleted$/),
  [INITIALIZED]: new RegExp(/ initialized$/),
  [ENTERED]: new RegExp(/ entered $/),
  [UNLOCKED]: new RegExp(/ unlocked $/),
  [STARTED]: new RegExp(/ started $/),
  [LOCKED]: new RegExp(/ locked $/),
  [STOPPED]: new RegExp(/ stopped $/),
  [ASSIGNED_NEW_OWNER]: new RegExp(/ assigned new owner $/),
};

export const resolveOutputForLogLine = (line: string) => {
  // Resolve active type, modify conditionally
  // let activeType: string | null = null;
  // for (const [type, regex] of Object.entries(logTypeRegex)) {
  //   if (regex.test(line)) {
  //     activeType = type;
  //     break;
  //   }
  // }

  const [
    , // Timestamp
    ...rest
  ] = line.split(' ');

  return appConfig.compactOutput ? line : rest.join(' ');
};

export const resolveLogLineType = (line: string) => {
  for (const [type, regex] of Object.entries(logTypeRegex)) {
    if (regex.test(line)) return type;
  }
  return null;
};
