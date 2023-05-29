#!/usr/bin/env node
// NOTE: the above is intentionally using node since that is the proper value after transpilation

import { createCommand } from 'commander';
import { sortBy } from 'lodash';
import prompts, { PromptObject } from 'prompts';
import { Options } from '../../types';
import {
  ENV_CONFIG_ELEMENTS,
  display,
  extendBaseCommand,
  getEnvConfig,
  saveEnvConfig,
} from '../../utils';

function getPrompt(element) {
  return element.isUrl
    ? `Enter url for the ${element.display}`
    : `Enter your ${element.display}`;
}

const cmd = createCommand();
cmd
  .name('wizard')
  .description('Collects and writes all config details')
  .showHelpAfterError(true);

extendBaseCommand(cmd);

cmd.action(async (options: Options) => {
  const removeTrailingSlash = (state) =>
    typeof state.value === 'string' && state.value.endsWith('/')
      ? state.value.substr(0, state.value.length - 1)
      : state.value;

  const oldConfig = await getEnvConfig(options.env);

  // NOTE: In a future update change the wizard to collect the identity url and allow self sign
  // information before continuing with the configuration. The URLs supplied by the config service
  // could be used as default values for a new configuration. Also, the wizard could be expanded to
  // include account registration if the CLI user is creating a new mdsCloud account and mdsCloud
  // user.
  // const mdsSdkUtils = require('@maddonkeysoftware/mds-cloud-sdk-node/src/lib/utils');
  // const foo = mdsSdkUtils.getConfigurationUrls('identityUrl', allowSelfCert));

  const configElements = sortBy(ENV_CONFIG_ELEMENTS, 'displayOrder');
  const query = configElements.map(
    (e) =>
      ({
        name: e.key,
        message: getPrompt(e),
        type: e.promptType,
        initial: oldConfig ? oldConfig[e.key] : '',
        onState: removeTrailingSlash,
      } as PromptObject),
  );

  try {
    const results = await prompts(query);
    saveEnvConfig(options.env, results);
  } catch (err) {
    if (err.message !== 'canceled') {
      display(err.stack);
    }
  }
});

cmd.parseAsync(process.argv);
