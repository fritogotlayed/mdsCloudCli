import { BaseBuilder } from './base-builder';
import { StackBuildArgs } from '../../../types/stack-build-args';
import { chmod, writeFile } from 'fs/promises';
import { ChildProcess } from '../../../utils/child-process';
import { join } from 'path';
import { compile } from 'handlebars';
import { homedir } from 'os';
import { Service } from '../../types/docker-compose';
import { AppConfTemplate } from '../templates/queue-service/app-config';
import { EntryPointTemplate } from '../templates/queue-service/entry-point';
import { ServiceRunMode } from '../../../utils';

export class QueueServiceBuilder extends BaseBuilder {
  #getBaseConfigDirectory(): string {
    return join(this.baseStackConfigDirectory, 'queueService', 'config');
  }
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

  protected async writeConfigs(args: StackBuildArgs): Promise<void> {
    this.safeOnMilestoneAchieved('Writing configs');
    await this.ensureDirectoryExists(join(this.#getBaseConfigDirectory()));

    this.safeOnStatusUpdate('Generating app config');
    const appConfTemplate = compile(AppConfTemplate);
    const isLocalDev = args.config.queue === ServiceRunMode.localDev;
    const outFile = isLocalDev
      ? join(this.sourceDirectory, 'config', 'localdev.js')
      : join(this.#getBaseConfigDirectory(), 'local.js');
    await writeFile(
      outFile,
      appConfTemplate({
        api_port: isLocalDev ? 8083 : 8888,
        enable_swagger: isLocalDev,
        log_level: 'trace',
        redis_url: isLocalDev ? 'redis://localhost:6379' : 'redis://redis:6379',

        mds_sdk_ns_url: isLocalDev
          ? 'http://localhost:8082'
          : 'http://mds-ns:8888',
        mds_sdk_sf_url: isLocalDev
          ? 'http://localhost:8085'
          : 'http://mds-sf:8888',
        mds_sdk_sm_url: isLocalDev
          ? 'http://localhost:8086'
          : 'http://mds-sm:8888',
        mds_sdk_identity_url: isLocalDev
          ? 'http://localhost:8079'
          : 'http://mds-identity-proxy:80',
        mds_sdk_account: '1',
        mds_sdk_user: 'admin',
        mds_sdk_pass: args.settings.defaultAdminPassword,

        orid_provider_key: 'mdsCloud',
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
      [ServiceRunMode.latest]: 'mdscloud/mds-queue-service:latest',
      [ServiceRunMode.local]: 'local/mds-queue-service:latest',
    };

    if (args.config.queue === ServiceRunMode.localDev) {
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
          NODE_ENV: 'production',
          MDS_SDK_VERBOSE: 'true',
        },
        command: ['./entry-point.sh'],
        volumes: [
          {
            sourcePath: join(this.#getBaseConfigDirectory(), 'local.js'),
            containerPath: '/usr/src/app/config/local.js',
          },
          {
            sourcePath: join(this.#getBaseConfigDirectory(), 'entry-point.sh'),
            containerPath: '/usr/src/app/entry-point.sh',
          },
        ],
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
