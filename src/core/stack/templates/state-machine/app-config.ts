export const AppConfTemplate = `module.exports = {
  // The port that the HTTP interface will listen upon for requests
  apiPort: {{api_port}},

  // MDS SDK initialization options
  mdsSdk: {
    identityUrl: '{{mds_sdk_identity_url}}',
    account: '{{mds_sdk_account}}',
    userId: '{{mds_sdk_user}}',
    password: '{{mds_sdk_pass}}',
    qsUrl: '{{mds_sdk_qs_url}}',
    sfUrl: '{{mds_sdk_sf_url}}',
  },

  // Underlying data store connection information
  mongo: {
    url: '{{db_conn_string}}',
    db: '{{db_conn_database}}',
  },

  // The provider element for all ORIDs created or consumed. Used in the validation process.
  oridProviderKey: '{{orid_provider_key}}',

  fastifyOptions: {
    logger: {
      level: '{{log_level}}',
    },
  },
};
`;
