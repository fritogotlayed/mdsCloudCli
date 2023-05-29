export type StackSettingsElement = {
  key: string;
  displayPrompt: string;
  queryPrompt: string;
  isSourceDir: boolean;
  isSecret: boolean;
  displayOrder: number;
};

export const STACK_SETTINGS_ELEMENTS: StackSettingsElement[] = [
  {
    key: 'identityServiceSourceDirectory',
    queryPrompt:
      'What folder does the "package.json" for IdentityService reside in on your local system?',
    displayPrompt: 'Identity Service Source',
    isSourceDir: true,
    isSecret: false,
    displayOrder: 1,
  },
  {
    key: 'notificationServiceSourceDirectory',
    queryPrompt:
      'What folder does the "package.json" for NotificationService reside in on your local system?',
    displayPrompt: 'Notification Service Source',
    isSourceDir: true,
    isSecret: false,
    displayOrder: 2,
  },
  {
    key: 'queueServiceSourceDirectory',
    queryPrompt:
      'What folder does the "package.json" for QueueService reside in on your local system?',
    displayPrompt: 'Queue Service Source',
    isSourceDir: true,
    isSecret: false,
    displayOrder: 3,
  },
  {
    key: 'fileServiceSourceDirectory',
    queryPrompt:
      'What folder does the "package.json" for FileService reside in on your local system?',
    displayPrompt: 'File Service Source',
    isSourceDir: true,
    isSecret: false,
    displayOrder: 4,
  },
  {
    key: 'serverlessFunctionsServiceSourceDirectory',
    queryPrompt:
      'What folder does the "package.json" for ServerlessFunctionsService reside in on your local system?',
    displayPrompt: 'Serverless Functions Service Source',
    isSourceDir: true,
    isSecret: false,
    displayOrder: 5,
  },
  {
    key: 'dockerMinionServiceSourceDirectory',
    queryPrompt:
      'What folder does the "package.json" for DockerMinionService reside in on your local system?',
    displayPrompt: 'Docker Minion Service Source',
    isSourceDir: true,
    isSecret: false,
    displayOrder: 6,
  },
  {
    key: 'stateMachineServiceSourceDirectory',
    queryPrompt:
      'What folder does the "package.json" for StateMachineService reside in on your local system?',
    displayPrompt: 'State Machine Service Source',
    isSourceDir: true,
    isSecret: false,
    displayOrder: 7,
  },
  {
    key: 'defaultAdminPassword',
    queryPrompt:
      'What default admin password would you like to use for your local stack?',
    displayPrompt: 'Default Admin Password',
    isSourceDir: false,
    isSecret: true,
    displayOrder: 8,
  },
];
