export const AppConfTemplate = `module.exports = {
  dbUrl: '{{db_conn_string}}',
  fastifyOptions: {
    logger: {
      level: 'debug',
    },
  },
  secrets: {
    privatePath: '/root/keys/key',
    privatePassword: '{{private_key_pass}}',
    publicPath: '/root/keys/key.pub.pem',
  },

  systemPassword: '{{sys_password}}',
  bypassUserActivation: true,
  passwordHashCycles: 8,
  oridProviderKey: 'mdsCloud',
}
`;
