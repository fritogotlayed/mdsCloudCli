import { StackConfig } from './stack-config';
import { StackSettings } from './stack-settings';
import { StackCredentials } from './stack-credentials';

export type StackBuildArgs = {
  config: StackConfig;
  settings: StackSettings;
  credentials: StackCredentials;
};
