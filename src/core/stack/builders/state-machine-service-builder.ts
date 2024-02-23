import { BaseBuilder } from './base-builder';
import { join } from 'path';
import { Service } from '../../types/docker-compose';
import { StackBuildArgs } from '../../../types/stack-build-args';
import { ChildProcess } from '../../../utils/child-process';
import { homedir } from 'os';
import { ServiceRunMode } from '../../../utils';

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
      [ServiceRunMode.latest]: 'mdscloud/mds-state-machine:latest',
      [ServiceRunMode.local]: 'local/mds-state-machine:latest',
    };

    const extraHosts = new Set<string>();
    const dependsOn = new Set<string>(['mongo', 'mds-identity-proxy']);

    if (args.config.queue === ServiceRunMode.localDev) {
      extraHosts.add('host.docker.internal:host-gateway');
    } else {
      dependsOn.add('mds-qs');
    }

    if (args.config.serverlessFunctions === ServiceRunMode.localDev) {
      extraHosts.add('host.docker.internal:host-gateway');
    } else {
      dependsOn.add('mds-sf');
    }

    if (args.config.stateMachine === ServiceRunMode.localDev) {
      // TODO: Implement
    } else {
      // API Service
      const apiService: Service = {
        key: 'mds-sm',
        image:
          imageLookup[args.config.stateMachine] ??
          'mdscloud/mds-state-machine:stable',
        restart: 'always',
        ports: {
          '8086': '8888',
        },
        command: ['server'],
        extraHosts: Array.from(extraHosts),
        environment: {
          NODE_ENV: 'production',
          // MDS_SM_DB_URL: `mongodb://${args.credentials.mongoRootUser}:${args.credentials.mongoRootPass}@mongo:27017`,
          FN_SM_DB_URL: `mongodb://${args.credentials.mongoRootUser}:${args.credentials.mongoRootPass}@mongo:27017`,
          ORID_PROVIDER_KEY: 'mdsCloud',
          PENDING_QUEUE_NAME: 'orid:1:mdsCloud:::1:qs:mds-sm-pendingQueue',
          IN_FLIGHT_QUEUE_NAME: 'orid:1:mdsCloud:::1:qs:mds-sm-inFlightQueue',
          MDS_IDENTITY_URL: 'http://mds-identity-proxy:80',
          MDS_SM_QS_URL: 'http://mds-qs:8888',
          MDS_SM_SF_URL:
            args.config.serverlessFunctions === ServiceRunMode.localDev
              ? 'http://host.docker.internal:8085'
              : 'http://mds-sf:8888',
          MDS_SM_SYS_USER: 'admin',
          MDS_SM_SYS_ACCOUNT: '1',
          MDS_SM_SYS_PASSWORD: args.settings.defaultAdminPassword,
          MDS_SDK_VERBOSE: 'true',
        },
        dependsOn: Array.from(dependsOn),
        networks: ['app'],
      };
      services.push(apiService);

      // Worker Service
      services.push({
        ...apiService,
        key: 'mds-sm-worker',
        ports: undefined,
        command: ['worker'],
      });
    }

    return services;
  }

  constructor(sourceDirectory: string, baseStackConfigDirectory: string) {
    super(sourceDirectory, baseStackConfigDirectory);
  }
}
