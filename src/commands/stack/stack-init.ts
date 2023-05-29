#!/usr/bin/env node
// NOTE: the above is intentionally using node since that is the proper value after transpilation

import { createCommand } from 'commander';
import { readFile, mkdir, stat, writeFile } from 'fs/promises';
import { display, STACK_SETTINGS_ELEMENTS } from '../../utils';
import { join } from 'path';
import { homedir } from 'os';
import { sortBy } from 'lodash';
import prompts, { PromptObject } from 'prompts';

const cmd = createCommand();
cmd
  .name('init')
  .description(
    'Initializes the various settings used by the cloud-in-a-box stack',
  )
  .showHelpAfterError(true);

async function ensureStackConfigDirectoryExists(): Promise<void> {
  await mkdir(join(homedir(), '.mds', 'stack', 'logs'), { recursive: true });
}

async function ensurePackageJsonExists(
  path: string,
): Promise<boolean | string> {
  if (!path) return true;
  const result = await stat(join(path, 'package.json'));
  return (
    result.isFile() ??
    'Directory does not appear to contain a package.json file'
  );
}

function removeTrailingSlash(value: string) {
  return typeof value === 'string' && value.endsWith('/')
    ? value.substring(0, value.length - 1)
    : value;
}

cmd.action(async () => {
  const createDirsTask = ensureStackConfigDirectoryExists();
  const settingsFilePath = join(homedir(), '.mds', 'stack', 'settings.json');
  let oldSettingsContents: string;

  try {
    oldSettingsContents = (await readFile(settingsFilePath)).toString();
  } catch {
    oldSettingsContents = '{}';
  }
  const oldSettings: Record<string, string> = JSON.parse(oldSettingsContents);
  const configElements = sortBy(STACK_SETTINGS_ELEMENTS, 'displayOrder');
  const query = configElements.map(
    (e) =>
      ({
        name: e.key,
        message: e.queryPrompt,
        type: e.isSecret ? 'password' : 'text',
        initial: oldSettings ? oldSettings[e.key] : process.cwd(),
        validate: e.isSourceDir ? ensurePackageJsonExists : undefined,
        format: removeTrailingSlash,
      } as PromptObject),
  );

  try {
    const results = await prompts(query);
    await createDirsTask;
    await writeFile(settingsFilePath, JSON.stringify(results, null, '\t'));
  } catch (err) {
    if (err.message !== 'canceled') {
      display(err.stack);
    }
  }
});

cmd.parseAsync(process.argv);
