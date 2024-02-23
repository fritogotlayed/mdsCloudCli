export const AppConfTemplate = `module.exports = {
  // The port that the HTTP interface will listen upon for requests
  apiPort: {{api_port}},

  // MDS SDK initialization options
  mdsSdk: {
    identityUrl: '{{mds_sdk_identity_url}}',
    account: '{{mds_sdk_account}}',
    userId: '{{mds_sdk_user}}',
    password: '{{mds_sdk_pass}}',
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

  providerConfig: {
    version: '1.0',
    runtimeMap: {
      node: 'mds',
      python: 'mds',
    },
    providers: {
      mds: {
        type: 'mdsCloud',
        baseUrl: '{{mds_sf_docker_minion_url}}',
      },
    },
  },
};
`;
