#!/usr/bin/env node
// NOTE: the above is intentionally using node since that is the proper value after transpilation

import { createCommand } from 'commander';
import { display } from '../../utils';
import { getDefaultEnvSync } from '../../utils/get-default-env';

const cmd = createCommand();
cmd
  .name('print')
  .description(
    'Prints the currently configured default environment commands will run with.',
  )
  .showHelpAfterError(true);

cmd.action(async () => {
  display(`Current environment: ${getDefaultEnvSync()}`);
});

cmd.parseAsync(process.argv);
