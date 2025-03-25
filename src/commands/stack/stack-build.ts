#!/usr/bin/env node
// NOTE: the above is intentionally using node since that is the proper value after transpilation

import { createCommand } from 'commander';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { display } from '../../utils';
import { join } from 'path';
import { homedir } from 'os';
import { StackServiceConfigManager } from '../../core/stack/stack-service-config-manager';
import { StackConfig } from '../../types/stack-config';
import { StackSettings } from '../../types/stack-settings';

const cmd = createCommand();
cmd
  .name('build')
  .description('Rebuilds containers for services in the cloud-in-a-box stack')
  .showHelpAfterError(true);

async function ensureStackConfigDirectoryExists(): Promise<void> {
  await mkdir(join(homedir(), '.mds', 'stack', 'logs'), { recursive: true });
}

async function clearLocalhostCachedCredentials() {
  const tokenCachePath = join(homedir(), '.mds', 'cache');

  let tokenCacheContents: Record<string, string>;
  try {
    tokenCacheContents = JSON.parse(
      (await readFile(tokenCachePath)).toString(),
    ) as Record<string, string>;
  } catch {
    // Do nothing since the cache is not required for the build
    return;
  }

  const newTokenCacheContents = Object.keys(tokenCacheContents).reduce(
    (acc, key) => {
      // Only add the key-value pair if it's not a localhost URL
      if (
        !(
          key.startsWith('https://127.0.0.1') ||
          key.startsWith('https://localhost') ||
          key.startsWith('http://127.0.0.1') ||
          key.startsWith('http://localhost')
        )
      ) {
        acc[key] = tokenCacheContents[key];
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  await writeFile(tokenCachePath, JSON.stringify(newTokenCacheContents));
}

cmd.action(async () => {
  const createDirsTask = ensureStackConfigDirectoryExists();
  const configFilePath = join(homedir(), '.mds', 'stack', 'config.json');
  const settingsFilePath = join(homedir(), '.mds', 'stack', 'settings.json');
  let configContents: string;
  let settingsContents: string;

  try {
    configContents = (await readFile(configFilePath)).toString();
    settingsContents = (await readFile(settingsFilePath)).toString();
  } catch {
    display(
      'Could not load stack config. Please run stack init and stack config before attempting to build the stack again',
    );
    return;
  }
  const config: StackConfig = JSON.parse(configContents);
  const settings: StackSettings = JSON.parse(settingsContents);
  const manager = new StackServiceConfigManager();

  await createDirsTask;
  manager.onStatusUpdate = (message) => display(message);
  manager.onMilestoneAchieved = (message) => display(message);
  await manager.configure(settings, config);

  await clearLocalhostCachedCredentials();
});

cmd.parseAsync(process.argv);
