import { BaseBuilder } from './base-builder';
import { join } from 'path';
import { chmod } from 'fs/promises';
import { Service } from '../../types/docker-compose';
import { StackBuildArgs } from '../../../types/stack-build-args';
import { writeFile } from 'fs/promises';
import { ChildProcess } from '../../../utils/child-process';
import { compile } from 'handlebars';
import { homedir } from 'os';
import { AppConfTemplate } from '../templates/serverless-functions/app-config';
import { EntryPointTemplate } from '../templates/serverless-functions/entry-point';
import { ServiceRunMode } from '../../../utils';

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

    const isLocalDev =
      args.config.serverlessFunctions === ServiceRunMode.localDev;

    // TODO: Figure out how to inject this entire config into the app config
    this.safeOnStatusUpdate('Generating provider config');
    const providerConfig = {
      version: '1.0',
      runtimeMap: {
        node: 'mds',
        python: 'mds',
      },
      providers: {
        mds: {
          type: 'mdsCloud',
          baseUrl: isLocalDev
            ? 'http://localhost:8888'
            : 'http://mds-sf-dockerMinion:8888',
        },
      },
    };

    const configPath = isLocalDev
      ? join(this.sourceDirectory, 'config', 'localdev.js')
      : join(this.#getBaseConfigDirectory(), 'local.js');

    this.safeOnStatusUpdate(`Generating app config: ${configPath}`);
    const appConfigTemplate = compile(AppConfTemplate);
    await writeFile(
      configPath,
      appConfigTemplate({
        api_port: isLocalDev ? 8085 : 8888,
        enable_swagger: isLocalDev,

        mds_sdk_identity_url: isLocalDev
          ? 'http://127.0.0.1:8079'
          : 'http://mds-identity-proxy:80',
        mds_sdk_account: '1',
        mds_sdk_user: 'admin',
        mds_sdk_pass: args.settings.defaultAdminPassword,

        db_conn_string: isLocalDev
          ? `mongodb://${args.credentials.mongoRootUser}:${args.credentials.mongoRootPass}@localhost:27017`
          : `mongodb://${args.credentials.mongoRootUser}:${args.credentials.mongoRootPass}@mongo:27017`,
        db_conn_database: 'mdsCloudServerlessFunctions',

        orid_provider_key: 'mdsCloud',
        log_level: 'trace',

        // NOTE: attempted {{ and {{{ variants of this, but neither emit in js format. This will likely require
        // a custom formatter which is out of scope right now.
        // mds_sf_provider_configuration: JSON.stringify(providerConfig, null, 2),
        // mds_sf_provider_configuration: providerConfig,
        mds_sf_docker_minion_url: providerConfig.providers.mds.baseUrl,
      }),
    );

    if (args.config.serverlessFunctions !== ServiceRunMode.localDev) {
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
      [ServiceRunMode.latest]: 'mdscloud/mds-serverless-functions:latest',
      [ServiceRunMode.local]: 'local/mds-serverless-functions:latest',
    };

    const extraHosts = new Set<string>();
    const dependsOn = new Set<string>([
      'logstash',
      'mongo',
      'mds-identity-proxy',
    ]);

    if (args.config.queue === ServiceRunMode.localDev) {
      extraHosts.add('host.docker.internal:host-gateway');
    } else {
      dependsOn.add('mds-qs');
    }

    if (args.config.dockerMinion === ServiceRunMode.localDev) {
      extraHosts.add('host.docker.internal:host-gateway');
    } else {
      dependsOn.add('mds-sf-dockerMinion');
    }

    if (args.config.serverlessFunctions === ServiceRunMode.localDev) {
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
        extraHosts: Array.from(extraHosts),
        environment: {
          NODE_ENV: 'production',
        },
        command: ['./entry-point.sh'],
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
        dependsOn: Array.from(dependsOn),
        networks: ['app'],
      });
    }

    return services;
  }

  constructor(sourceDirectory: string, baseStackConfigDirectory: string) {
    super(sourceDirectory, baseStackConfigDirectory);
  }
}
