#!/usr/bin/env node
// NOTE: the above is intentionally using node since that is the proper value after transpilation

import { createCommand } from 'commander';
import { join } from 'path';
import { homedir } from 'os';
import { display, displayTable, delay } from '../../utils';
import { readFile } from 'fs/promises';
import { StackCredentials } from '../../types/stack-credentials';
import { ChildProcess } from '../../utils/child-process';

async function checkContainerStatus(name: string): Promise<string> {
  const childProcess = new ChildProcess({
    command: `docker container inspect -f '{{.State.Status}}' ${name}`,
    workingDir: join(homedir(), '.mds', 'stack'),
  });
  const result = await childProcess.execute();
  return result.trim();
}

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
  display(
    'Prompt will regain focus after the stack is up and the ELK setup is complete.',
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

  let checkAgain = true;
  do {
    const containerStatus = await checkContainerStatus('mds-stack-elk-setup-1');
    if (containerStatus === 'exited') {
      checkAgain = false;
    } else if (containerStatus.startsWith('Error response from daemon')) {
      checkAgain = false;
    } else {
      await delay(500);
    }
  } while (checkAgain);

  // Remove confusion by anyone using docker desktop that may see the stopped ELK setup container
  // and wonder if setup failed
  const composeCleanupProcess = new ChildProcess({
    command: 'docker rm mds-stack-elk-setup-1',
    workingDir: join(homedir(), '.mds', 'stack'),
  });
  await composeCleanupProcess.execute();

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
