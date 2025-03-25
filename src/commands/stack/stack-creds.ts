#!/usr/bin/env node
// NOTE: the above is intentionally using node since that is the proper value after transpilation

import { createCommand } from 'commander';
import { join } from 'path';
import { homedir } from 'os';
import { displayTable } from '../../utils';
import { readFile } from 'fs/promises';
import { StackCredentials } from '../../types/stack-credentials';

const cmd = createCommand();
cmd
  .name('creds')
  .description('Gets the credentials for the cloud-in-a-box services')
  .showHelpAfterError(true);

cmd.action(async () => {
  const stackCredsFilePath = join(homedir(), '.mds', 'stack', 'stack-creds.js');
  const credsData = await readFile(stackCredsFilePath);
  const creds = JSON.parse(credsData.toString()) as StackCredentials;

  displayTable(
    [
      [
        'Mongo DB',
        `mongodb://${creds.mongoRootUser}@localhost:27017`,
        `PWD: ${creds.mongoRootPass}`,
      ],
      [
        'Kibana',
        'http://localhost:5601',
        `UN: ${creds.kibana.user}  PWD: ${creds.kibana.password}`,
      ],
    ],
    ['Service', 'Url', 'Notes'],
  );
});

cmd.parseAsync(process.argv);
