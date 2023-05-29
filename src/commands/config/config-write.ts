#!/usr/bin/env node
// NOTE: the above is intentionally using node since that is the proper value after transpilation

import { createCommand } from 'commander';
import { map } from 'lodash';
import { Options } from '../../types';
import {
  ENV_CONFIG_ELEMENTS,
  display,
  extendBaseCommand,
  saveEnvConfig,
} from '../../utils';

const cmd = createCommand();
cmd
  .name('write')
  .argument('<key>', 'The element to write in the environment')
  .argument('<value>', 'The new value of the element')
  .description(
    `Writes a config detail: Valid keys: ${[
      ...map(ENV_CONFIG_ELEMENTS, 'key'),
      'all',
    ].join(', ')}`,
  )
  .showHelpAfterError(true);

extendBaseCommand(cmd);

cmd.action(async (key: string, value: string, options: Options) => {
  const configKeys = map(ENV_CONFIG_ELEMENTS, 'key');
  if (!configKeys.includes(key)) {
    return Promise.resolve(
      display(
        `"${key}" key not understood. Expected: ${configKeys.join(', ')}`,
      ),
    );
  }

  const newSettings = {};
  newSettings[key] = value;

  return saveEnvConfig(options.env, newSettings);
});

cmd.parseAsync(process.argv);
