#!/usr/bin/env node
// NOTE: the above is intentionally using node since that is the proper value after transpilation

import { createCommand } from 'commander';
import { join } from 'path';
import { homedir } from 'os';
import { display, displayTable } from '../../utils';
import { readFile } from 'fs/promises';
import { StackCredentials } from '../../types/stack-credentials';
import { ChildProcess } from '../../utils/child-process';

const cmd = createCommand();
cmd
  .name('up')
  .description('Starts the cloud-in-a-box services')
  .showHelpAfterError(true);

cmd.action(async () => {
  display('Bringing stack up...');
  display(
    'NOTE: This may take some time if your system does not existing docker images.',
  );
  const stackCredsFilePath = join(homedir(), '.mds', 'stack', 'stack-creds.js');
  const loadCredsTask = readFile(stackCredsFilePath);
  const composeUpProcess = new ChildProcess({
    command: 'docker compose -p mds-stack up -d',
    workingDir: join(homedir(), '.mds', 'stack'),
    logFile: join(homedir(), '.mds', 'stack', 'logs', 'stack-init.log'),
  });

  const credsData = await loadCredsTask;
  await composeUpProcess.execute();

  const creds = JSON.parse(credsData.toString()) as StackCredentials;

  displayTable(
    [
      [
        'Mongo DB',
        `mongodb://${creds.mongoRootUser}@localhost:27017`,
        `PWD: ${creds.mongoRootPass}`,
      ],
      ['Kibana', 'http://localhost:5601', 'UN: elastic  PWD: changeme'],
    ],
    ['Service', 'Url', 'Notes'],
  );
});

cmd.parseAsync(process.argv);
