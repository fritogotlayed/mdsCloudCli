import { BaseBuilder } from './base-builder';
import { StackBuildArgs } from '../../../types/stack-build-args';
import { ChildProcess } from '../../../utils/child-process';
import { join } from 'path';
import { homedir } from 'os';
import { Service } from '../../types/docker-compose';

export class QueueServiceBuilder extends BaseBuilder {
  protected getBuilderIdentifier(): string {
    return 'Queue Service';
  }

  protected async buildDockerImage(args: StackBuildArgs): Promise<void> {
    if (args.config.queue === 'local') {
      const imageBuildTask = new ChildProcess({
        command: 'docker build -t local/mds-queue-service:latest .',
        workingDir: this.sourceDirectory,
        logFile: join(
          homedir(),
          '.mds',
          'stack',
          'logs',
          'queueServiceDockerBuild.log',
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
        `Bypassing container build due to ${args.config.queue} configuration`,
      );
    }
  }

  protected async writeConfigs(): Promise<void> {
    // No configs to write for this service
  }

  getDockerComposeServices(args: StackBuildArgs): Service[] {
    const services: Service[] = [];
    const imageLookup = {
      // NOTE: Stable is the default
      latest: 'mdscloud/mds-queue-service:latest',
      local: 'local/mds-queue-service:latest',
    };

    if (args.config.queue === 'localDev') {
      // Nothing to do here
    } else {
      services.push({
        key: 'mds-qs',
        image:
          imageLookup[args.config.queue] ?? 'mdscloud/mds-queue-service:stable',
        restart: 'always',
        ports: {
          '8083': '8888',
        },
        environment: {
          MDS_LOG_URL: 'http://logstash:6002',
          MDS_QS_DB_URL: 'redis://redis:6379',
          ORID_PROVIDER_KEY: 'mdsCloud',
          MDS_IDENTITY_URL: 'http://mds-identity-proxy:80',
          MDS_QS_SF_URL: 'http://mds-sf:8888',
          MDS_QS_SM_URL: 'http://mds-sf:8888',
          MDS_QS_SYS_USER: 'admin',
          MDS_QS_SYS_ACCOUNT: '1',
          MDS_QS_SYS_PASSWORD: args.settings.defaultAdminPassword,
          MDS_LOG_ALL_REQUESTS: 'false',
          MDS_SDK_VERBOSE: 'true',
        },
        dependsOn: ['redis', 'logstash', 'mds-identity-proxy'],
        networks: ['app'],
      });
    }

    return services;
  }

  constructor(sourceDirectory: string, baseStackConfigDirectory: string) {
    super(sourceDirectory, baseStackConfigDirectory);
  }
}
