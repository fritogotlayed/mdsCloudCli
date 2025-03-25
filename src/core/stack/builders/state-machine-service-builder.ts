import { BaseBuilder } from './base-builder';
import { join } from 'path';
import { compile } from 'handlebars';
import { writeFile, chmod } from 'fs/promises';
import { Service } from '../../types/docker-compose';
import { StackBuildArgs } from '../../../types/stack-build-args';
import { ChildProcess } from '../../../utils/child-process';
import { homedir } from 'os';
import { ServiceRunMode } from '../../../utils';
import { AppConfTemplate } from '../templates/state-machine/app-config';
import { EntryPointTemplate } from '../templates/state-machine/entry-point';

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
    this.safeOnMilestoneAchieved('Writing configs');
    await this.ensureDirectoryExists(this.#getBaseConfigDirectory());
    const isLocalDev = args.config.stateMachine === ServiceRunMode.localDev;

    this.safeOnStatusUpdate('Generating override app config');
    const appConfTemplate = compile(AppConfTemplate);
    await writeFile(
      isLocalDev
        ? join(this.sourceDirectory, 'config', 'localdev.js')
        : join(this.#getBaseConfigDirectory(), 'local.js'),
      appConfTemplate({
        api_port: isLocalDev ? 8086 : 8888,

        mds_sdk_identity_url: isLocalDev
          ? 'http://127.0.0.1:8079'
          : 'http://mds-identity-proxy:80',
        mds_sdk_qs_url: isLocalDev
          ? 'http://localhost:8083'
          : 'http://mds-qs:8888',
        mds_sdk_sf_url: isLocalDev
          ? 'http://localhost:8085'
          : 'http://mds-sf:8888',
        mds_sdk_account: '1',
        mds_sdk_user: 'admin',
        mds_sdk_pass: args.settings.defaultAdminPassword,

        db_conn_string: isLocalDev
          ? `mongodb://${args.credentials.mongoRootUser}:${args.credentials.mongoRootPass}@localhost:27017`
          : `mongodb://${args.credentials.mongoRootUser}:${args.credentials.mongoRootPass}@mongo:27017`,
        db_conn_database: 'mdsCloudStateMachine',

        orid_provider_key: 'mdsCloud',

        log_level: 'trace',
      }),
    );

    if (!isLocalDev) {
      this.safeOnStatusUpdate('Generating entrypoint script');
      const entryPointTemplate = compile(EntryPointTemplate);
      await writeFile(
        join(this.#getBaseConfigDirectory(), 'entry-point.sh'),
        entryPointTemplate({}),
      );

      await chmod(
        join(this.#getBaseConfigDirectory(), 'entry-point.sh'),
        0o774,
      );
    }
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

    if (args.config.stateMachine === ServiceRunMode.localDev) {
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
        command: ['./entry-point.sh', 'server'],
        volumes: [
          {
            sourcePath: join(this.#getBaseConfigDirectory(), 'local.js'),
            containerPath: '/usr/src/app/config/local.js',
            mode: 'ro',
          },
          {
            sourcePath: join(this.#getBaseConfigDirectory(), 'entry-point.sh'),
            containerPath: '/usr/src/app/entry-point.sh',
          },
        ],
        extraHosts: Array.from(extraHosts),
        environment: {
          NODE_ENV: 'production',
          // MDS_SM_DB_URL: `mongodb://${args.credentials.mongoRootUser}:${args.credentials.mongoRootPass}@mongo:27017`,
          // FN_SM_DB_URL: `mongodb://${args.credentials.mongoRootUser}:${args.credentials.mongoRootPass}@mongo:27017`,
          // ORID_PROVIDER_KEY: 'mdsCloud',
          PENDING_QUEUE_NAME: 'orid:1:mdsCloud:::1:qs:mds-sm-pendingQueue',
          IN_FLIGHT_QUEUE_NAME: 'orid:1:mdsCloud:::1:qs:mds-sm-inFlightQueue',
          // MDS_IDENTITY_URL: 'http://mds-identity-proxy:80',
          // MDS_SM_QS_URL: 'http://mds-qs:8888',
          // MDS_SM_SF_URL:
          //   args.config.serverlessFunctions === ServiceRunMode.localDev
          //     ? 'http://host.docker.internal:8085'
          //     : 'http://mds-sf:8888',
          // MDS_SM_SYS_USER: 'admin',
          // MDS_SM_SYS_ACCOUNT: '1',
          // MDS_SM_SYS_PASSWORD: args.settings.defaultAdminPassword,
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
        command: ['./entry-point.sh', 'worker'],
      });
    }

    return services;
  }

  constructor(sourceDirectory: string, baseStackConfigDirectory: string) {
    super(sourceDirectory, baseStackConfigDirectory);
  }
}
