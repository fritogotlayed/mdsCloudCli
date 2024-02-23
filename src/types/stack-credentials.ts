export type StackCredentials = {
  mongoRootUser: string;
  mongoRootPass: string;
  identity: {
    dbUser: string;
    dbPassword: string;
  };
  kibana: {
    user: string;
    password: string;
  };
};
