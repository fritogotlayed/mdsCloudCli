import { Command, createOption } from 'commander';
import { getDefaultEnvSync } from './get-default-env';

export function extendBaseCommand(command: Command) {
  const opt = createOption(
    '--env <envName>',
    'The environment to utilize for this operation',
  )
    .default(getDefaultEnvSync())
    .env('MDS_ENV');
  command.addOption(opt);
}
