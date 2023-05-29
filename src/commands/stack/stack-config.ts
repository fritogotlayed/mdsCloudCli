#!/usr/bin/env node
// NOTE: the above is intentionally using node since that is the proper value after transpilation

import { createCommand } from 'commander';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { display, STACK_CONFIG_ELEMENTS } from '../../utils';
import { join } from 'path';
import { homedir } from 'os';
import { sortBy } from 'lodash';
import prompts, { PromptObject } from 'prompts';

const cmd = createCommand();
cmd
  .name('config')
  .description('Adjusts the services run in the cloud-in-a-box stack')
  .showHelpAfterError(true);

async function ensureStackConfigDirectoryExists(): Promise<void> {
  await mkdir(join(homedir(), '.mds', 'stack', 'logs'), { recursive: true });
}

cmd.action(async () => {
  const createDirsTask = ensureStackConfigDirectoryExists();
  const configFilePath = join(homedir(), '.mds', 'stack', 'config.json');
  let oldConfigContents: string;

  try {
    oldConfigContents = (await readFile(configFilePath)).toString();
  } catch {
    oldConfigContents = '{}';
  }
  const oldConfig: Record<string, string> = JSON.parse(oldConfigContents);
  const configElements = sortBy(STACK_CONFIG_ELEMENTS, 'displayOrder');
  const query = configElements.map((e) => {
    const choices = e.options.map((o) => ({
      title: o,
      value: o,
    }));
    let initialIndex: number;
    choices.forEach((choice, index) => {
      if (choice.value === oldConfig[e.key]) {
        initialIndex = index;
      }
    });
    return {
      name: e.key,
      message: `Which container mode would you like to use for ${e.displayPrompt}?`,
      type: 'select',
      choices,
      initial: initialIndex === -1 ? 0 : initialIndex,
    } as PromptObject;
  });

  try {
    const results = await prompts(query);
    await createDirsTask;
    await writeFile(configFilePath, JSON.stringify(results, null, '\t'));
  } catch (err) {
    if (err.message !== 'canceled') {
      display(err.stack);
    }
  }
});

cmd.parseAsync(process.argv);
