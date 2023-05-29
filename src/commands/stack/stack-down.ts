#!/usr/bin/env node
// NOTE: the above is intentionally using node since that is the proper value after transpilation

import { createCommand } from 'commander';
import { join } from 'path';
import { homedir } from 'os';
import { display } from '../../utils';
import { ChildProcess } from '../../utils/child-process';

const cmd = createCommand();
cmd
  .name('down')
  .description('Halts the cloud-in-a-box services')
  .showHelpAfterError(true);

cmd.action(async () => {
  display('Bringing stack down...');
  const composeDownProcess = new ChildProcess({
    command: 'docker compose -p mds-stack down -v',
    workingDir: join(homedir(), '.mds', 'stack'),
    logFile: join(homedir(), '.mds', 'stack', 'logs', 'stack-down.log'),
  });

  await composeDownProcess.execute();
});

cmd.parseAsync(process.argv);
