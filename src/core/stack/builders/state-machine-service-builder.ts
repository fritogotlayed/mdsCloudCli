import { BaseBuilder } from './base-builder';
import { join } from 'path';
import { Service } from '../../types/docker-compose';
import { StackBuildArgs } from '../../../types/stack-build-args';
import { writeFile } from 'fs/promises';
import { ChildProcess } from '../../../utils/child-process';
import { compile } from 'handlebars';
import { homedir } from 'os';
import { ProviderConfTemplate } from '../templates/serverless-functions/provider-config';

export class StateMachineServiceBuilder extends BaseBuilder {
  #getBaseConfigDirectory(): string {
    return join(this.baseStackConfigDirectory, 'stateMachineService', 'config');
  }
  protected getBuilderIdentifier(): string {
    return 'State Machine Service';
  }

  protected async buildDockerImage(args: StackBuildArgs): Promise<void> {
    if (args.config.stateMachine === 'local') {
      const imageBuildTask = new ChildProcess({
        command: 'docker build -t local/mds-state-machine:latest .',
        workingDir: this.sourceDirectory,
        logFile: join(
          homedir(),
          '.mds',
          'stack',
          'logs',
          'stateMachineDockerBuild.log',
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
        `Bypassing container build due to ${args.config.stateMachine} configuration`,
      );
    }
  }

  protected async writeConfigs(args: StackBuildArgs): Promise<void> {
    // TODO: Update once configs are used
  }

  getDockerComposeServices(args: StackBuildArgs): Service[] {
    const services: Service[] = [];
    const imageLookup = {
      // NOTE: Stable is the default
      latest: 'mdscloud/mds-state-machine:latest',
      local: 'local/mds-state-machine:latest',
    };

    if (args.config.stateMachine === 'localDev') {
      // TODO: Implement
    } else {
      services.push({
        key: 'mds-sm',
        image:
          imageLookup[args.config.stateMachine] ??
          'mdscloud/mds-state-machine:stable',
        restart: 'always',
        ports: {
          '8086': '8888',
        },
        command: ['server'],
        environment: {
          NODE_ENV: 'production',
          FORCE_INTERNAL_WORKER: 'true',
          MDS_SM_DB_URL: `mongodb://${args.credentials.mongoRootUser}:${args.credentials.mongoRootPass}@mongo:27017`,
          ORID_PROVIDER_KEY: 'mdsCloud',
          PENDING_QUEUE_NAME: 'orid:1:mdsCloud:::1:qs:mds-sm-pendingQueue',
          IN_FLIGHT_QUEUE_NAME: 'orid:1:mdsCloud:::1:qs:mds-sm-inFlightQueue',
          MDS_IDENTITY_URL: 'http://mds-identity-proxy:80',
          MDS_SM_QS_URL: 'http://mds-qs:8888',
          MDS_SM_SF_URL: 'http://mds-sf:8888',
          MDS_FN_SYS_USER: 'admin',
          MDS_FN_SYS_ACCOUNT: '1',
          MDS_FN_SYS_PASSWORD: args.settings.defaultAdminPassword,
          MDS_SDK_VERBOSE: 'true',
        },
        dependsOn: ['mongo', 'mds-qs', 'mds-identity-proxy'],
        networks: ['app'],
      });
    }

    return services;
  }

  constructor(sourceDirectory: string, baseStackConfigDirectory: string) {
    super(sourceDirectory, baseStackConfigDirectory);
  }
}
