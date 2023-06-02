import { BaseBuilder } from './base-builder';
import { StackBuildArgs } from '../../../types/stack-build-args';
import { ChildProcess } from '../../../utils/child-process';
import { join } from 'path';
import { homedir } from 'os';
import { Service } from '../../types/docker-compose';

export class NotificationServiceBuilder extends BaseBuilder {
  protected getBuilderIdentifier(): string {
    return 'Notification Service';
  }

  protected async buildDockerImage(args: StackBuildArgs): Promise<void> {
    if (args.config.notification === 'local') {
      const imageBuildTask = new ChildProcess({
        command: 'docker build -t local/mds-notification-service:latest .',
        workingDir: this.sourceDirectory,
        logFile: join(
          homedir(),
          '.mds',
          'stack',
          'logs',
          'notificationServiceDockerBuild.log',
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
        `Bypassing container build due to ${args.config.notification} configuration`,
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
      latest: 'mdscloud/mds-notification-service:latest',
      local: 'local/mds-notification-service:latest',
    };

    if (args.config.notification === 'localDev') {
      // Nothing to do here
    } else {
      services.push({
        key: 'mds-ns',
        image:
          imageLookup[args.config.notification] ??
          'mdscloud/mds-notification-service:stable',
        restart: 'always',
        ports: {
          '8082': '8888',
        },
        environment: {
          MDS_LOG_URL: 'http://logstash:6002',
          REDIS_URL: 'redis://redis:6379',
          ORID_PROVIDER_KEY: 'mdsCloud',
          MDS_IDENTITY_URL: 'http://mds-identity-proxy:80',
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
