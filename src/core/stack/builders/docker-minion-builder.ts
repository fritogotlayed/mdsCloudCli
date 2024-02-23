import { BaseBuilder } from './base-builder';
import { join } from 'path';
import { Service } from '../../types/docker-compose';
import { StackBuildArgs } from '../../../types/stack-build-args';
import { chmod, writeFile } from 'fs/promises';
import { ChildProcess } from '../../../utils/child-process';
import { compile } from 'handlebars';
import { homedir } from 'os';
import { RegistryConfYmlTemplate } from '../templates/docker-minion/registry/config-yml';
import { AppConfTemplate } from '../templates/docker-minion/app-config';
import { EntryPointTemplate } from '../templates/docker-minion/entry-point';
import { ServiceRunMode } from '../../../utils';

export class DockerMinionBuilder extends BaseBuilder {
  #getBaseConfigDirectory(): string {
    return join(this.baseStackConfigDirectory, 'dockerMinion');
  }
  protected getBuilderIdentifier(): string {
    return 'Docker Minion';
  }

  protected async buildDockerImage(args: StackBuildArgs): Promise<void> {
    if (args.config.dockerMinion === 'local') {
      const imageBuildTask = new ChildProcess({
        command: 'docker build -t local/mds-docker-minion:latest .',
        workingDir: this.sourceDirectory,
        logFile: join(
          homedir(),
          '.mds',
          'stack',
          'logs',
          'dockerMinionDockerBuild.log',
        ),
        onStart: () => {
          this.safeOnMilestoneAchieved(
            `Building container locally at ${this.sourceDirectory}`,
          );
        },
      });
      await imageBuildTask.execute();
      // TODO: Check exit codes
    } else {
      this.safeOnMilestoneAchieved(
        `Bypassing container build due to ${args.config.dockerMinion} configuration`,
      );
    }
  }

  protected async writeConfigs(args: StackBuildArgs): Promise<void> {
    this.safeOnMilestoneAchieved('Writing configs');
    await this.ensureDirectoryExists(this.#getBaseConfigDirectory());
    await Promise.all([
      this.ensureDirectoryExists(
        join(this.#getBaseConfigDirectory(), 'registry'),
      ),
      this.ensureDirectoryExists(join(this.#getBaseConfigDirectory(), 'app')),
    ]);

    this.safeOnStatusUpdate('Generating docker registry config');
    const registryConfTemplate = compile(RegistryConfYmlTemplate);
    await writeFile(
      join(this.#getBaseConfigDirectory(), 'registry', 'config.yml'),
      registryConfTemplate({
        authHeader: `Bearer ${Buffer.from(
          `admin:${args.settings.defaultAdminPassword}`,
        ).toString('base64')}`,
      }),
    );

    this.safeOnStatusUpdate('Generating app config');
    const appConfTemplate = compile(AppConfTemplate);
    if (args.config.dockerMinion === ServiceRunMode.localDev) {
      await writeFile(
        join(this.sourceDirectory, 'config', 'localdev.js'),
        appConfTemplate({
          registry_url: '127.0.0.1:5000',
          registry_user: 'admin',
          registry_pass: args.settings.defaultAdminPassword,

          container_network: 'mds-stack_app',

          mds_sdk_ns_url: 'http://127.0.0.1:8082',
          mds_sdk_qs_url: 'http://127.0.0.1:8083',
          mds_sdk_fs_url: 'http://127.0.0.1:8084',
          mds_sdk_identity_url: 'http://127.0.0.1:8079',
          mds_sdk_account: '1',
          mds_sdk_user: 'admin',
          mds_sdk_pass: args.settings.defaultAdminPassword,

          db_conn_string: `mongodb://${args.credentials.mongoRootUser}:${args.credentials.mongoRootPass}@localhost:27017`,
          db_conn_database: 'mdsCloudDockerMinion',

          orid_provider_key: 'mdsCloud',

          log_level: 'trace',
        }),
      );
    } else {
      await writeFile(
        join(this.#getBaseConfigDirectory(), 'app', 'local.js'),
        appConfTemplate({
          registry_url: 'docker-registry:5000',
          registry_user: 'admin',
          registry_pass: args.settings.defaultAdminPassword,

          container_network: 'mds-stack_app',

          mds_sdk_ns_url: 'http://mds-ns:8082',
          mds_sdk_qs_url: 'http://mds-qs:8083',
          mds_sdk_fs_url: 'http://mds-fs:8084',
          mds_sdk_identity_url: 'http://mds-identity-proxy:80',
          mds_sdk_account: '1',
          mds_sdk_user: 'admin',
          mds_sdk_pass: args.settings.defaultAdminPassword,

          db_conn_string: `mongodb://${args.credentials.mongoRootUser}:${args.credentials.mongoRootPass}@mongo:27017`,
          db_conn_database: 'mdsCloudDockerMinion',

          orid_provider_key: 'mdsCloud',

          log_level: 'trace',
        }),
      );

      this.safeOnStatusUpdate('Generating entrypoint script');
      const entryPointTemplate = compile(EntryPointTemplate);
      await writeFile(
        join(this.#getBaseConfigDirectory(), 'app', 'entry-point.sh'),
        entryPointTemplate({}),
      );

      await chmod(
        join(this.#getBaseConfigDirectory(), 'app', 'entry-point.sh'),
        0o774,
      );
    }
  }

  getDockerComposeServices(args: StackBuildArgs): Service[] {
    const services: Service[] = [
      {
        key: 'docker-registry',
        image: 'registry',
        ports: {
          '5000': '5000',
        },
        volumes: [
          {
            sourcePath: join(
              this.#getBaseConfigDirectory(),
              'registry',
              'config.yml',
            ),
            containerPath: '/etc/docker/registry/config.yml',
            mode: 'ro',
          },
        ],
        dependsOn: ['mds-ns'],
        logging: {
          driver: 'none',
        },
        networks: ['app'],
      },
    ];

    const imageLookup = {
      // NOTE: Stable is the default
      [ServiceRunMode.latest]: 'mdscloud/mds-docker-minion:latest',
      [ServiceRunMode.local]: 'local/mds-docker-minion:latest',
    };
    const ports: Record<string, string> = {};

    if (args.config.serverlessFunctions === ServiceRunMode.localDev) {
      ports['8888'] = '8888';
    }

    if (args.config.dockerMinion === ServiceRunMode.localDev) {
      // TODO: Implement
    } else {
      // TODO: port forward 8888 if serverless functions in dev mode
      services.push({
        key: 'mds-sf-dockerMinion',
        image:
          imageLookup[args.config.dockerMinion] ??
          'mdscloud/mds-docker-minion:stable',
        restart: 'always',
        environment: {
          NODE_ENV: 'production',
          MDS_SDK_VERBOSE: 'true',
        },
        ports,
        command: ['./entry-point.sh'],
        volumes: [
          {
            sourcePath: '/var/run/docker.sock',
            containerPath: '/var/run/docker.sock',
          },
          {
            sourcePath: join(this.#getBaseConfigDirectory(), 'app', 'local.js'),
            containerPath: '/usr/src/app/config/local.js',
          },
          {
            sourcePath: join(
              this.#getBaseConfigDirectory(),
              'app',
              'entry-point.sh',
            ),
            containerPath: '/usr/src/app/entry-point.sh',
          },
        ],
        dependsOn: [
          'logstash',
          'mongo',
          'docker-registry',
          'mds-identity-proxy',
        ],
        networks: ['app'],
      });
    }

    return services;
  }

  constructor(sourceDirectory: string, baseStackConfigDirectory: string) {
    super(sourceDirectory, baseStackConfigDirectory);
  }
}
