#!/usr/bin/env node
// NOTE: the above is intentionally using node since that is the proper value after transpilation

import { createCommand } from 'commander';
import { find, map, sortBy } from 'lodash';
import { Options } from '../../types';
import {
  ENV_CONFIG_ELEMENTS,
  display,
  displayTable,
  extendBaseCommand,
  getEnvConfig,
} from '../../utils';

const cmd = createCommand();
cmd
  .name('inspect')
  .argument('[key]', 'The element to inspect from the environment', 'all')
  .description(
    `Inspects a config detail: Valid keys: ${[
      ...map(ENV_CONFIG_ELEMENTS, 'key'),
      'all',
    ].join(', ')}`,
  )
  .showHelpAfterError(true);

extendBaseCommand(cmd);

cmd.action(async (key: string, options: Options) => {
  if (key !== 'all' && !find(ENV_CONFIG_ELEMENTS, (e) => e.key === key)) {
    display(
      `"${key}" key not understood. Expected: ${map(
        ENV_CONFIG_ELEMENTS,
        'key',
      ).join(', ')}`,
    );
    return;
  }

  const settings = await getEnvConfig<Record<string, any>>(options.env);
  if (key === 'all') {
    const rows: any[] = [];
    const configElements = sortBy(ENV_CONFIG_ELEMENTS, 'displayOrder');
    configElements.forEach((e) => {
      let value;
      if (e.key === 'password') {
        value = settings[e.key] ? '***' : '';
      } else {
        value = settings[e.key] || '';
      }
      rows.push([e.display, value]);
    });
    displayTable(rows, ['Setting', 'Value']);
  } else {
    display(
      settings[key] ||
        `It appears "${key}" is not present in the ${options.env} config.`,
    );
  }
});

cmd.parseAsync(process.argv);
