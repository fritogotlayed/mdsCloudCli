export const AppConfTemplate = `module.exports = {
  // MDS SDK initialization options
  mdsSdk: {
    identityUrl: '{{mds_sdk_identity_url}}',
    account: '{{mds_sdk_account}}',
    userId: '{{mds_sdk_user}}',
    password: '{{mds_sdk_pass}}',
  },
  
  fastifyOptions: {
    logger: {
      level: '{{log_level}}',
    },
  },

  // The location that files are persisted once uploaded.
  uploadFolder: '/UploadService',

  // The provider element for all ORIDs created or consumed. Used in the validation process.
  oridProviderKey: '{{orid_provider_key}}',
}
`;
