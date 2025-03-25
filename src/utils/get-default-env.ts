import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, promises as fsPromises } from 'fs';
import * as IN_PROC_CACHE from './in-proc-cache';

const envFileName = 'selectedEnv';
const settingDir = join(homedir(), '.mds');

/**
 * Returns the default environment name.
 *
 * @returns The default environment name.
 * @deprecated Use getDefaultEnv instead.
 */
export function getDefaultEnvSync(): string {
  const cacheKey = 'getDefaultEnv';
  const cacheVal = IN_PROC_CACHE.get(cacheKey);
  if (cacheVal) {
    return cacheVal as string;
  }

  const file = join(settingDir, envFileName);
  if (existsSync(file)) {
    const data = readFileSync(file);
    if (data) {
      // Trim just in case the file was edited by the user.
      IN_PROC_CACHE.set(cacheKey, data.toString().trim());
      return IN_PROC_CACHE.get(cacheKey) as string;
    }
  }

  return 'default';
}

// New asynchronous version
export async function getDefaultEnv(): Promise<string> {
  const cacheKey = 'getDefaultEnv';
  const cacheVal = IN_PROC_CACHE.get(cacheKey);
  if (cacheVal) {
    return cacheVal as string;
  }

  const file = join(settingDir, envFileName);
  try {
    // Check if file exists asynchronously
    try {
      await fsPromises.access(file);
    } catch {
      return 'default';
    }

    // Read file asynchronously
    const data = await fsPromises.readFile(file);
    if (data) {
      // Trim just in case the file was edited by the user.
      const trimmedData = data.toString().trim();
      IN_PROC_CACHE.set(cacheKey, trimmedData);
      return trimmedData;
    }
  } catch (error) {
    // If any error occurs during file operations, return the default
    console.error('Error reading default environment:', error);
  }

  return 'default';
}
