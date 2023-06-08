import { BaseBuilder } from './base-builder';
import { join } from 'path';
import { Service } from '../../types/docker-compose';
import { StackBuildArgs } from '../../../types/stack-build-args';
import { writeFile } from 'fs/promises';
import { ChildProcess } from '../../../utils/child-process';
import { compile } from 'handlebars';
import { homedir } from 'os';
import { ProviderConfTemplate } from '../templates/serverless-functions/provider-config';

export class ServerlessFunctionsServiceBuilder extends BaseBuilder {
  #getBaseConfigDirectory(): string {
    return join(
      this.baseStackConfigDirectory,
      'serverlessFunctionsService',
      'config',
    );
  }
  protected getBuilderIdentifier(): string {
    return 'Serverless Functions Service';
  }

  protected async buildDockerImage(args: StackBuildArgs): Promise<void> {
    if (args.config.serverlessFunctions === 'local') {
      const imageBuildTask = new ChildProcess({
        command: 'docker build -t local/mds-serverless-functions:latest .',
        workingDir: this.sourceDirectory,
        logFile: join(
          homedir(),
          '.mds',
          'stack',
          'logs',
          'serverlessFunctionsDockerBuild.log',
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
        `Bypassing container build due to ${args.config.serverlessFunctions} configuration`,
      );
    }
  }

  protected async writeConfigs(args: StackBuildArgs): Promise<void> {
    this.safeOnMilestoneAchieved('Writing configs');
    await this.ensureDirectoryExists(this.#getBaseConfigDirectory());

    if (args.config.serverlessFunctions === 'localDev') {
      // TODO: Implement
    } else {
      this.safeOnStatusUpdate('Generating provider config');
      const providerConfTemplate = compile(ProviderConfTemplate);
      await writeFile(
        join(this.#getBaseConfigDirectory(), 'provider-config.json'),
        providerConfTemplate({}),
      );
    }
  }

  getDockerComposeServices(args: StackBuildArgs): Service[] {
    const services: Service[] = [];
    const imageLookup = {
      // NOTE: Stable is the default
      latest: 'mdscloud/mds-serverless-functions:latest',
      local: 'local/mds-serverless-functions:latest',
    };

    if (args.config.serverlessFunctions === 'localDev') {
      // TODO: Implement
    } else {
      services.push({
        key: 'mds-sf',
        image:
          imageLookup[args.config.serverlessFunctions] ??
          'mdscloud/mds-serverless-functions:stable',
        restart: 'always',
        ports: {
          '8085': '8888',
        },
        environment: {
          NODE_ENV: 'production',
          MDS_FN_MONGO_URL: `mongodb://${args.credentials.mongoRootUser}:${args.credentials.mongoRootPass}@mongo:27017`,
          MDS_LOG_URL: 'http://logstash:6002',
          MDS_FN_MONGO_DB_NAME: 'mdsCloudServerlessFunctions',
          MDS_IDENTITY_URL: 'http://mds-identity-proxy:80',
          ORID_PROVIDER_KEY: 'mdsCloud',
          MDS_FN_SYS_USER: 'admin',
          MDS_FN_SYS_ACCOUNT: '1',
          MDS_FN_SYS_PASSWORD: args.settings.defaultAdminPassword,
          MDS_FN_SYS_ALLOW_SELFSIGN_CERT: 'true',
          MDS_FN_PROVIDER_CONFIG: '/configs/provider-config.json',
          MDS_SDK_VERBOSE: 'true',
        },
        volumes: [
          {
            sourcePath: join(
              this.#getBaseConfigDirectory(),
              'provider-config.json',
            ),
            containerPath: '/configs/provider-config.json',
            mode: 'ro',
          },
        ],
        dependsOn: [
          'logstash',
          'mongo',
          'mds-qs',
          'mds-fs',
          'mds-ns',
          'mds-sf-dockerMinion',
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
