#!/usr/bin/env node
// NOTE: the above is intentionally using node since that is the proper value after transpilation

import { createCommand } from 'commander';

const cmd = createCommand();
cmd
  .name('stack')
  .description('Commands to configure and run the local cloud-in-a-box stack')
  .executableDir('stack')
  .command(
    'init',
    'Initializes the various settings used by the cloud-in-a-box stack',
  )
  .command('config', 'Adjusts the services run in the cloud-in-a-box stack')
  .command(
    'build',
    'Rebuilds containers for services in the cloud-in-a-box stack',
  )
  .command('up', 'Starts the cloud-in-a-box services')
  .command('down', 'Halts the cloud-in-a-box services');

cmd.parse(process.argv);
