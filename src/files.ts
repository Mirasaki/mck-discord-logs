import { readdir, stat } from 'fs/promises';
import path from 'path';

export const findNewestFile = async (
  directoryPath: string,
  skipN = 0,
  extension?: string | null,
  fileNamePattern?: string
): Promise<string | null> => {
  try {
    const files = await readdir(directoryPath);
    if (files.length === 0) return null;

    // Sort files by creation time (ctimeMs) in descending order
    let sortedFiles = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(directoryPath, file);
        const fileStat = await stat(filePath);
        return { filePath, ctimeMs: fileStat.ctimeMs };
      })
    );

    // Can't continue
    if (!sortedFiles) return null;

    // Resolve workable files
    sortedFiles = sortedFiles
      // Filter whitelisted files
      .filter((e) =>
        (extension === null || typeof extension === 'undefined' || e.filePath.endsWith(extension))
        && (fileNamePattern === null || typeof fileNamePattern === 'undefined' || e.filePath.includes(fileNamePattern))
      )
      // Sort by creation date
      .sort((a, b) => b.ctimeMs - a.ctimeMs);

    // If there are fewer files than skipN, return null
    if (sortedFiles.length <= skipN) return null;

    // Return the path of the (skipN + 1)-th newest file
    const fileAtSkinN = sortedFiles[skipN] as { filePath: string; ctimeMs: number };
    console.debug(`Found ${sortedFiles.length} files in ${directoryPath}, returning ${
      fileAtSkinN.filePath
    } as the ${skipN + 1}-th newest file${extension ? ` with extension ${extension}` : ''}`);
    return fileAtSkinN.filePath;
  } catch (error) {
    throw new Error(`Error finding newest file: ${error}`);
  }
};
