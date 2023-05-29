#!/usr/bin/env node
// NOTE: the above is intentionally using node since that is the proper value after transpilation

import { MdsSdk } from '@maddonkeysoftware/mds-cloud-sdk-node';
import { createCommand } from 'commander';
import prompts, { PromptObject } from 'prompts';
import { RegisterUser } from '../lib/register-user';
import { Options } from '../types';
import {
  EnvConfigElement,
  ENV_CONFIG_ELEMENTS,
  display,
  extendBaseCommand,
  listEnvs,
  saveEnvConfig,
  setDefaultEnv,
  stringifyForDisplay,
} from '../utils';

const cmd = createCommand();
cmd
  .name('create')
  .description('Collects initial setup information')
  .showHelpAfterError(true);

extendBaseCommand(cmd);

function getPrompt(element: EnvConfigElement) {
  return element.isUrl
    ? `Enter url for the ${element.display}`
    : `Enter your ${element.display}`;
}

async function isEnvAlreadyConfigured(envName: string) {
  const configuredEnvs = await listEnvs();
  const isConfigured = configuredEnvs.indexOf(envName) !== -1;
  return isConfigured;
}

// Prompts uses any here :-(
function removeTrailingSlash(state: any) {
  return typeof state.value === 'string' && state.value.endsWith('/')
    ? state.value.substr(0, state.value.length - 1)
    : state.value;
}

async function configureIdentity() {
  const questions = [
    {
      name: 'identityUrl',
      message: 'Please enter the identity url for your system.',
      type: 'text',
      onState: removeTrailingSlash,
    } as PromptObject,
    {
      name: 'allowSelfSignCert',
      message: 'Allow self signed certificates?',
      type: 'confirm',
    } as PromptObject,
  ];

  const { identityUrl, allowSelfSignCert } = await prompts(questions);
  await MdsSdk.initialize({
    identityUrl,
    allowSelfSignCert,
  });

  try {
    const identityClient = await MdsSdk.getIdentityServiceClient();
    await identityClient.getPublicSignature();
    return identityUrl;
  } catch (err) {
    display('It appears that the url entered is incorrect or not responsive.');
    console.dir(err);
    throw err;
  }
}

async function getEnvUrls() {
  const configElements = ENV_CONFIG_ELEMENTS.filter(
    (e) => e.isUrl && e.key !== 'identityUrl',
  ).sort((a, b) => a.displayOrder - b.displayOrder);

  const query = configElements.map(
    (e) =>
      ({
        name: e.key,
        message: getPrompt(e),
        type: e.promptType,
        onState: removeTrailingSlash,
      } as PromptObject),
  );

  return prompts(query);
}

cmd.action(async (options: Options) => {
  try {
    const isConfigured = await isEnvAlreadyConfigured(options.env);

    if (isConfigured) {
      display(
        `Environment ${options.env} appears to already be configured. Use the config and/or env sub-command instead.`,
      );
    } else {
      const identityUrl = await configureIdentity();
      const registrationAnswers = await RegisterUser();
      const envUrls = await getEnvUrls();

      await saveEnvConfig(options.env, {
        account: registrationAnswers.accountId,
        userId: registrationAnswers.userId,
        password: registrationAnswers.password,
        identityUrl,
        ...envUrls,
      });
      await setDefaultEnv(options.env);
      display(
        'Congratulations! You are now ready to start using this MDS Cloud install!',
      );
    }
    // display(`State machine created successfully. ${result.orid}`);
  } catch (err) {
    display(
      'An error occurred while running setup. Please clear the errors and try again.',
    );
    display('If the problem persists reach out to your support personnel.');
    display('');
    display(stringifyForDisplay(err.message || err));
  }
});

cmd.parseAsync(process.argv);
