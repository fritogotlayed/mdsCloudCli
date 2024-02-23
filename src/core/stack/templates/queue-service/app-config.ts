export const AppConfTemplate = `module.exports = {
  // The port that the HTTP interface will listen upon for requests
  apiPort: {{api_port}},

  // When true, enables the swagger interface. This should only be enabled for non-production environments.
  enableSwagger: {{enable_swagger}},

  fastifyOptions: {
    logger: {
      level: '{{log_level}}',
    },
  },

  // The redis instance that will be used for data persistence
  redisUrl: '{{redis_url}}',

  // MDS SDK configuration
  mdsSdk: {
    nsUrl: '{{mds_sdk_ns_url}}',
    sfUrl: '{{mds_sdk_sf_url}}',
    smUrl: '{{mds_sdk_sm_url}}',
    identityUrl: '{{mds_sdk_identity_url}}',
    account: '{{mds_sdk_account}}',
    userId: '{{mds_sdk_user}}',
    password: '{{mds_sdk_pass}}',
  },

  // The provider element for all ORIDs created or consumed. Used in the validation process.
  oridProviderKey: '{{orid_provider_key}}',
};
`;
