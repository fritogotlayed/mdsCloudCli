export const AppConfTemplate = `module.exports = {
  // Connection details for the private docker repository
  registry: {
    address: '{{registry_url}}',
    user: '{{registry_user}}',
    password: '{{registry_pass}}',
  },

  // Network that function containers should be added to
  containerNetwork: '{{container_network}}',

  // MDS SDK initialization options
  mdsSdk: {
    nsUrl: '{{mds_sdk_ns_url}}',
    qsUrl: '{{mds_sdk_qs_url}}',
    fsUrl: '{{mds_sdk_fs_url}}',
    identityUrl: '{{mds_sdk_identity_url}}',
    account: '{{mds_sdk_account}}',
    userId: '{{mds_sdk_user}}',
    password: '{{mds_sdk_pass}}',
  },

  // Underlying data store connection information
  mongo: {
    url: '{{db_conn_string}}',
    database: '{{db_conn_database}}',
  },

  // The provider element for all ORIDs created or consumed. Used in the validation process.
  oridProviderKey: '{{orid_provider_key}}',

  fastifyOptions: {
    logger: {
      level: '{{log_level}}',
    },
  },
}
`;
