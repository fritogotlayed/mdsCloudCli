import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { EOL, homedir } from 'os';
import { ElkBuilder } from './builders/elk-builder';
import { DockerComposeRoot, Service } from '../types/docker-compose';
import { generateRandomString } from '../../utils/generate-random-string';
import { StackSettings } from '../../types/stack-settings';
import { StackConfig } from '../../types/stack-config';
import { MongoBuilder } from './builders/mongo-builder';
import { StackBuildArgs } from '../../types/stack-build-args';
import { StackCredentials } from '../../types/stack-credentials';
import { BaseBuilder } from './builders/base-builder';
import { IdentityBuilder } from './builders/identity-builder';
import { NotificationServiceBuilder } from './builders/notification-service-builder';
import { RedisBuilder } from './builders/redis-builder';
import { QueueServiceBuilder } from './builders/queue-service-builder';
import { FileServiceBuilder } from './builders/file-service-builder';

export interface IStackServiceConfigManager {
  onStatusUpdate?: (string) => void;
  onMilestoneAchieved?: (string) => void;
  configure(
    settings: Record<string, string>,
    config: Record<string, string>,
  ): void;
}

export class StackServiceConfigManager implements IStackServiceConfigManager {
  #stackCredentials: StackCredentials | undefined;

  public onMilestoneAchieved: (string) => void;
  public onStatusUpdate: (string) => void;

  #safeOnStatusUpdate(message: string) {
    if (this.onStatusUpdate) {
      this.onStatusUpdate(message);
    }
  }

  #safeOnMilestoneAchieved(message: string) {
    if (this.onMilestoneAchieved) {
      this.onMilestoneAchieved(message);
    }
  }

  async #resetStackConfigDirectory(): Promise<void> {
    const rootPath = join(homedir(), '.mds', 'stack', 'configs');
    try {
      await rm(rootPath, { recursive: true });
    } catch {
      // No op
    }
    await mkdir(rootPath, {
      recursive: true,
    });
  }

  async #removeExistingDockerComposeFile(): Promise<void> {
    try {
      await rm(join(homedir(), '.mds', 'stack', 'docker-compose.yml'));
    } catch {
      // We don't care if the file does not exist.
    }
  }

  #generateDockerComposeBody(root: DockerComposeRoot): string {
    let buffer = '';
    const networks = new Set<string>();
    const volumes = new Set<string>();
    const addLine = (data?: string, indent = 0) => {
      const padding = new Array(indent + 1).join('  ');
      const line = `${padding ?? ''}${data ?? ''}${EOL}`;
      buffer += line;
    };
    const addElement = (
      key: string,
      data: string | boolean | undefined | null,
      indent: number,
    ) => {
      if (data !== undefined && data !== null) {
        switch (typeof data) {
          case 'string':
            addLine(`${key} ${data}`, indent);
            break;
          case 'boolean':
            addLine(`${key} ${data ? 'true' : 'false'}`, indent);
            break;
          default:
            throw new Error(`Unhandled data type: ${typeof data}`);
        }
      }
    };

    addLine(`version: '${root.version}'`);
    addLine();
    addLine('services:');
    addLine();

    let isFirstService = true;
    root.services.forEach((service) => {
      if (!isFirstService) {
        addLine();
      }
      isFirstService = false;
      if (service.comments) {
        service.comments.forEach((line) => {
          let outLine = '';
          if (!!line && !line.startsWith('#')) {
            outLine += '# ';
          }
          outLine += line;
          addLine(outLine, 1);
        });
      }
      addLine(`${service.key}:`, 1);
      if (service.build) {
        addLine('build:', 2);
        addElement('context:', service.build.context, 3);
        if (service.build.args) {
          addLine('args:', 3);
          Object.keys(service.build.args).forEach((key) => {
            addElement(`${key}:`, service.build.args[key], 4);
          });
        }
      }
      addElement('init:', service.init, 2);
      addElement('image:', service.image, 2);
      addElement('restart:', service.restart, 2);
      if (service.extraHosts) {
        addLine('extra_hosts:', 2);
        service.extraHosts.forEach((key) => {
          addElement(`-`, key, 3);
        });
      }
      if (service.environment) {
        addLine('environment:', 2);
        Object.keys(service.environment).forEach((key) => {
          const data = service.environment[key].includes(' ')
            ? `"${service.environment[key]}"`
            : `${service.environment[key]}`;
          addElement(`${key}:`, data, 3);
        });
      }
      if (service.ports) {
        addLine('ports:', 2);
        Object.keys(service.ports).forEach((key) => {
          addElement('-', `"${key}:${service.ports[key]}"`, 3);
        });
      }
      if (service.volumes) {
        addLine('volumes:', 2);
        service.volumes.forEach((volumeDatum) => {
          let outDatum = `${volumeDatum.sourcePath}:${volumeDatum.containerPath}`;
          if (!volumeDatum.sourcePath.includes('/')) {
            volumes.add(volumeDatum.sourcePath);
          }
          if (volumeDatum.mode) {
            outDatum += `:${volumeDatum.mode}`;
          }
          addElement('-', outDatum, 3);
        });
      }
      if (service.logging) {
        addLine('logging:', 2);
        addElement('driver:', service.logging.driver, 3);
      }
      if (service.networks) {
        addLine('networks:', 2);
        service.networks.forEach((network) => {
          networks.add(network);
          addElement('-', network, 3);
        });
      }
      if (service.dependsOn) {
        addLine('depends_on:', 2);
        service.dependsOn.forEach((dependency) => {
          addElement('-', dependency, 3);
        });
      }
    });

    if (networks.size) {
      addLine();
      addLine('networks:');
      Array.from(networks).forEach((network) => {
        addLine(`${network}:`, 1);
      });
    }

    if (volumes.size) {
      addLine();
      addLine('volumes:');
      Array.from(volumes).forEach((volume) => {
        addLine(`${volume}:`, 1);
      });
    }

    return buffer;
  }

  async #writeDockerComposeFile(root: DockerComposeRoot): Promise<void> {
    const dockerFilePath = join(
      homedir(),
      '.mds',
      'stack',
      'docker-compose.yml',
    );
    await writeFile(dockerFilePath, this.#generateDockerComposeBody(root));
  }

  async configure(settings: StackSettings, config: StackConfig): Promise<void> {
    const baseStackConfigDirectory = join(
      homedir(),
      '.mds',
      'stack',
      'configs',
    );
    this.#safeOnStatusUpdate('Configuring services');
    const resetConfigDirTask = this.#resetStackConfigDirectory();

    const rootUser = 'dbuser';
    const rootPass = generateRandomString(24);
    this.#stackCredentials = {
      // TODO: Break these apart
      mongoRootUser: rootUser,
      mongoRootPass: rootPass,
      identity: {
        dbUser: rootUser,
        dbPassword: rootPass,
      },
    };

    await resetConfigDirTask;
    await this.#removeExistingDockerComposeFile();
    const builderOptions: StackBuildArgs = {
      settings,
      config,
      credentials: this.#stackCredentials,
    };

    const tasks: Promise<void>[] = [];
    const services: Service[] = [];
    const builders: BaseBuilder[] = [
      new MongoBuilder(baseStackConfigDirectory),
      new RedisBuilder(),
      new ElkBuilder(baseStackConfigDirectory),
      new IdentityBuilder(
        settings.identityServiceSourceDirectory,
        baseStackConfigDirectory,
      ),
      new NotificationServiceBuilder(
        settings.notificationServiceSourceDirectory,
        baseStackConfigDirectory,
      ),
      new QueueServiceBuilder(
        settings.queueServiceSourceDirectory,
        baseStackConfigDirectory,
      ),
      new FileServiceBuilder(
        settings.fileServiceSourceDirectory,
        baseStackConfigDirectory,
      ),
    ];

    builders.forEach((builder) => {
      builder.onStatusUpdate = (message) => this.#safeOnStatusUpdate(message);
      builder.onMilestoneAchieved = (message) =>
        this.#safeOnMilestoneAchieved(message);

      services.push(...builder.getDockerComposeServices(builderOptions));
      tasks.push(builder.build(builderOptions));
    });

    // TODO: Promise waterfall here?
    try {
      await Promise.all(tasks);
    } catch (err) {
      console.dir(err);
    }

    const networks = new Set<string>();
    services.forEach((service) => {
      service.networks.forEach((network) => {
        networks.add(network);
      });
    });
    const volumes = new Set<string>();
    services.forEach((service) => {
      (service.volumes || []).forEach((volume) => {
        if (!volume.sourcePath.includes('/')) {
          volumes.add(volume.sourcePath);
        }
      });
    });

    await this.#writeDockerComposeFile({
      version: '3.2',
      services,
      networks: Array.from(networks),
      volumes: Array.from(volumes),
    });

    const stackCredsFilePath = join(
      homedir(),
      '.mds',
      'stack',
      'stack-creds.js',
    );

    await writeFile(
      stackCredsFilePath,
      JSON.stringify(this.#stackCredentials, null, 2),
    );
  }
}
