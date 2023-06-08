import { BaseBuilder } from './base-builder';
import { join } from 'path';
import { Service } from '../../types/docker-compose';
import { StackBuildArgs } from '../../../types/stack-build-args';
import { chmod, writeFile } from 'fs/promises';
import { ChildProcess } from '../../../utils/child-process';
import { compile } from 'handlebars';
import { AppConfTemplate } from '../templates/file-service/app-config';
import { EntryPointTemplate } from '../templates/file-service/entry-point';
import { homedir } from 'os';

export class FileServiceBuilder extends BaseBuilder {
  protected getBuilderIdentifier(): string {
    return 'File Service';
  }

  protected async buildDockerImage(args: StackBuildArgs): Promise<void> {
    if (args.config.file === 'local') {
      const imageBuildTask = new ChildProcess({
        command: 'docker build -t local/mds-file-service:latest .',
        workingDir: this.sourceDirectory,
        logFile: join(
          homedir(),
          '.mds',
          'stack',
          'logs',
          'fileServiceDockerBuild.log',
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
        `Bypassing container build due to ${args.config.file} configuration`,
      );
    }
  }

  protected async writeConfigs(args: StackBuildArgs): Promise<void> {
    this.safeOnMilestoneAchieved('Writing configs');
    await this.ensureDirectoryExists(
      join(this.baseStackConfigDirectory, 'fileService', 'config'),
    );

    if (args.config.file === 'localDev') {
      // TODO: Implement
    } else {
      this.safeOnStatusUpdate('Generating override app config');
      const appConfTemplate = compile(AppConfTemplate);
      await writeFile(
        join(
          this.baseStackConfigDirectory,
          'fileService',
          'config',
          'local.js',
        ),
        appConfTemplate({}),
      );

      this.safeOnStatusUpdate('Generating entrypoint script');
      const entryPointTemplate = compile(EntryPointTemplate);
      await writeFile(
        join(this.baseStackConfigDirectory, 'fileService', 'entry-point.sh'),
        entryPointTemplate({}),
      );

      await chmod(
        join(this.baseStackConfigDirectory, 'fileService', 'entry-point.sh'),
        0o774,
      );
    }
  }

  getDockerComposeServices(args: StackBuildArgs): Service[] {
    const configDir = join(this.baseStackConfigDirectory, 'fileService');
    const services: Service[] = [];
    const imageLookup = {
      // NOTE: Stable is the default
      latest: 'mdscloud/mds-file-service:latest',
      local: 'local/mds-file-service:latest',
    };

    if (args.config.file === 'localDev') {
      // TODO: Implement
    } else {
      services.push({
        key: 'mds-fs',
        image:
          imageLookup[args.config.file] ?? 'mdscloud/mds-file-service:stable',
        restart: 'always',
        ports: {
          '8084': '8888',
        },
        environment: {
          NODE_ENV: 'production',
          MDS_SDK_VERBOSE: 'true',
        },
        command: ['./entry-point.sh'],
        volumes: [
          {
            sourcePath: join(configDir, 'entry-point.sh'),
            containerPath: '/usr/src/app/entry-point.sh',
          },
          {
            sourcePath: join(configDir, 'config', 'local.js'),
            containerPath: '/usr/src/app/config/local.js',
            mode: 'ro',
          },
          {
            sourcePath: 'file-service-data',
            containerPath: '/UploadService',
          },
        ],
        dependsOn: ['logstash', 'mds-identity-proxy'],
        networks: ['app'],
      });
    }

    return services;
  }

  constructor(sourceDirectory: string, baseStackConfigDirectory: string) {
    super(sourceDirectory, baseStackConfigDirectory);
  }
}
