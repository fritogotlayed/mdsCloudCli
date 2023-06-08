export type StackConfigElement = {
  key: string;
  options: string[];
  displayPrompt: string;
  displayOrder: number;
};

const options = ['stable', 'latest', 'local', 'localDev'];

export const STACK_CONFIG_ELEMENTS: StackConfigElement[] = [
  {
    key: 'identity',
    options,
    displayPrompt: 'identity',
    displayOrder: 1,
  },
  {
    key: 'notification',
    options,
    displayPrompt: 'notification service',
    displayOrder: 2,
  },
  {
    key: 'queue',
    options,
    displayPrompt: 'queue service',
    displayOrder: 3,
  },
  {
    key: 'file',
    options,
    displayPrompt: 'file service',
    displayOrder: 4,
  },
  {
    key: 'serverlessFunctions',
    options,
    displayPrompt: 'serverless functions service',
    displayOrder: 5,
  },
  {
    key: 'dockerMinion',
    options,
    displayPrompt: 'docker minion',
    displayOrder: 6,
  },
  {
    key: 'stateMachine',
    options,
    displayPrompt: 'state machine service',
    displayOrder: 7,
  },
];
