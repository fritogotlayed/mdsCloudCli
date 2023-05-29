export const LocalDevConfTemplate = `module.exports = {
  // The database to use for data persistence
  dbUrl: '{{db_conn_string}}',

  fastifyOptions: {
    logger: {
      level: 'trace',
    },
  },

  secrets: {
    // The path to the private key used for JWT signing
    privatePath: '{{private_key_path}}',

    // The password associated with the private key used for JWT signing
    privatePassword: '{{private_key_pass}}',

    // The path to the public key that external systems can use to validate the JWT has not been
    // tampered with
    publicPath: '{{public_key_path}}',
  },

  // The number of times to re-hash user passwords before storage or comparison.
  passwordHashCycles: 8,

  // The password to use for the default admin user when the system is initialized. A randomized
  // string is used if this value is left blank
  systemPassword: '{{system_pass}}',

  // When true users registered to the system will be set active upon creation. When false users
  // will need to obtain their activation code before being able to authenticate with the system.
  bypassUserActivation: true,

  // The provider element for all ORIDs created or consumed. USed int he valdation process.
  oridProviderKey: 'mdsCloud',
};
`;
