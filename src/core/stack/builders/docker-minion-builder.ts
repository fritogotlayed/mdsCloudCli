import { BaseBuilder } from './base-builder';
import { join } from 'path';
import { Service } from '../../types/docker-compose';
import { StackBuildArgs } from '../../../types/stack-build-args';
import { writeFile } from 'fs/promises';
import { ChildProcess } from '../../../utils/child-process';
import { compile } from 'handlebars';
import { homedir } from 'os';
import { RegistryConfYmlTemplate } from '../templates/docker-minion/registry/config-yml';

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
    await Promise.all([
      this.ensureDirectoryExists(
        join(this.#getBaseConfigDirectory(), 'registry'),
      ),
      this.ensureDirectoryExists(
        join(this.#getBaseConfigDirectory(), 'registry-ui'),
      ),
    ]);
    await this.ensureDirectoryExists(this.#getBaseConfigDirectory());
    // TODO: Implement registry config

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

    if (args.config.dockerMinion === 'localDev') {
      // TODO: Implement
    } else {
      // TODO: Implement after move to Typescript
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
      latest: 'mdscloud/mds-docker-minion:latest',
      local: 'local/mds-docker-minion:latest',
    };

    if (args.config.dockerMinion === 'localDev') {
      // TODO: Implement
    } else {
      services.push({
        key: 'mds-sf-dockerMinion',
        image:
          imageLookup[args.config.dockerMinion] ??
          'mdscloud/mds-docker-minion:stable',
        restart: 'always',
        environment: {
          NODE_ENV: 'production',
          MDS_IDENTITY_URL: 'http://mds-identity-proxy:80',
          ORID_PROVIDER_KEY: 'mdsCloud',
          MDS_LOG_URL: 'http://logstash:6002',
          MDS_FN_RUNTIMES: 'node',
          MDS_FN_MONGO_URL: `mongodb://${args.credentials.mongoRootUser}:${args.credentials.mongoRootPass}@mongo:27017`,
          MDS_FN_CONTAINER_HOST: 'docker-registry:5000',
          MDS_FN_CONTAINER_NETWORK: 'mds-stack_app',
          MDS_FN_SYS_USER: 'admin',
          MDS_FN_SYS_ACCOUNT: '1',
          MDS_FN_SYS_PASSWORD: args.settings.defaultAdminPassword,
          MDS_REDIS_URL: 'redis://redis:6379',
          MDS_SDK_VERBOSE: 'true',
        },
        volumes: [
          {
            sourcePath: '/var/run/docker.sock',
            containerPath: '/var/run/docker.sock',
          },
        ],
        dependsOn: [
          'redis',
          'logstash',
          'mongo',
          'mds-fs',
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
