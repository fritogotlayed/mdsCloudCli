#!/usr/bin/env node
// NOTE: the above is intentionally using node since that is the proper value after transpilation

import { MdsSdk } from '@maddonkeysoftware/mds-cloud-sdk-node';
import { StateMachineServiceClient } from '@maddonkeysoftware/mds-cloud-sdk-node/clients';
import { createCommand, createOption, InvalidArgumentError } from 'commander';
import { Options } from '../../types';
import {
  delay,
  display,
  extendBaseCommand,
  stringifyForDisplay,
} from '../../utils';

// Seconds
const MIN_WATCH_INTERVAL = 10;

const cmd = createCommand();
cmd
  .name('invoke')
  .argument('<orid>', 'The ORID of the function to invoke')
  .addOption(
    createOption(
      '--watch',
      'Flag to run the state machine and watch for state changes, omit to run asynchronously.',
    ),
  )
  .addOption(
    createOption(
      '--watchInterval',
      'Interval, in seconds, at which to print updates from the watch flag',
    ).argParser((value) => {
      const parsedValue = parseInt(value, 10);
      if (isNaN(parsedValue)) {
        throw new InvalidArgumentError('watchInterval must be a number');
      }
      return parsedValue;
    }),
  )
  .addOption(
    createOption('--input <input>', 'Input to be passed to the function'),
  )
  .addOption(
    createOption(
      '--inputType <inputType>',
      'Input type to be supplied to the function. Use object for JSON object formatting',
    )
      .choices(['string', 'object'])
      .default('string'),
  )
  .description('Gets details for the specified serverless function')
  .showHelpAfterError(true);

extendBaseCommand(cmd);

async function watchOutput(
  client: StateMachineServiceClient,
  orid: string,
  watchInterval?: number,
) {
  let interval = watchInterval || MIN_WATCH_INTERVAL;
  if (interval < MIN_WATCH_INTERVAL) {
    interval = MIN_WATCH_INTERVAL;
    display(
      `Watch interval must be at least ${MIN_WATCH_INTERVAL}. Using ${MIN_WATCH_INTERVAL} instead of ${interval}.`,
    );
  }

  display('');
  display('States:', true);
  let running = true;
  let lastState = '';
  const printedOperations = [];
  do {
    const { status, operations } = await client.getDetailsForExecution(orid);
    const orderedOperations = operations.sort((a, b) => {
      return new Date(a.created).valueOf() - new Date(b.created).valueOf();
    });

    const latestOperation = orderedOperations[orderedOperations.length - 1];
    if (status === 'Succeeded' || status === 'Failed') {
      running = false;
      display('');
      display(`Execution: ${status}`);
      display(`Output: ${stringifyForDisplay(latestOperation.output)}`);
    } else {
      const newState = latestOperation.stateKey;
      for (const operation of orderedOperations) {
        if (!printedOperations.includes(operation.id)) {
          printedOperations.push(operation.id);
          display('');
          display(`${operation.stateKey}.`, true);
        } else {
          if (lastState !== newState) {
            lastState = newState;
          } else if (operation.stateKey === lastState) {
            display('.', true);
          }
        }
      }
      await delay(interval * 1000);
    }
  } while (running);
}

type Params = {
  watch: boolean;
  watchInterval?: number;
  input?: string;
  inputType: string;
};

cmd.action(async (orid: string, options: Options<Params>) => {
  await MdsSdk.initialize(options.env);
  const client = await MdsSdk.getStateMachineServiceClient();

  try {
    const input: unknown =
      options.inputType === 'object'
        ? JSON.parse(options.input)
        : options.input;

    const result = await client.invokeStateMachine(orid, input || '{}');
    if (options.watch) {
      display(`Execution Started: ${result.orid}`);
      watchOutput(client, result.orid, options.watchInterval);
    } else {
      display(`Function invoked successfully: ${result.orid}`);
    }
  } catch (err) {
    display('An error occurred while invoking the serverless function');
    display(stringifyForDisplay(err.message || err));
  }
});

cmd.parseAsync(process.argv);
