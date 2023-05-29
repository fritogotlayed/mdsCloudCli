export type EnvConfigElement = {
  key: string;
  display: string;
  promptType: string;
  isUrl: boolean;
  displayOrder: number;
};

export const ENV_CONFIG_ELEMENTS: EnvConfigElement[] = [
  {
    key: 'account',
    display: 'Account',
    promptType: 'text',
    isUrl: false,
    displayOrder: 1,
  },
  {
    key: 'userId',
    display: 'User Id',
    promptType: 'text',
    isUrl: false,
    displayOrder: 2,
  },
  {
    key: 'password',
    display: 'Password',
    promptType: 'password',
    isUrl: false,
    displayOrder: 3,
  },
  {
    key: 'identityUrl',
    display: 'identity service',
    promptType: 'text',
    isUrl: true,
    displayOrder: 4,
  },
  {
    key: 'allowSelfSignCert',
    display: 'allow self signed certificates',
    promptType: 'confirm',
    isUrl: false,
    displayOrder: 5,
  },
  {
    key: 'nsUrl',
    display: 'notification service',
    promptType: 'text',
    isUrl: true,
    displayOrder: 6,
  },
  {
    key: 'qsUrl',
    display: 'queue service',
    promptType: 'text',
    isUrl: true,
    displayOrder: 7,
  },
  {
    key: 'fsUrl',
    display: 'file service',
    promptType: 'text',
    isUrl: true,
    displayOrder: 8,
  },
  {
    key: 'sfUrl',
    display: 'serverless function service',
    promptType: 'text',
    isUrl: true,
    displayOrder: 9,
  },
  {
    key: 'smUrl',
    display: 'state machine service',
    promptType: 'text',
    isUrl: true,
    displayOrder: 10,
  },
];
