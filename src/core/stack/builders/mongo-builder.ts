import { BaseBuilder } from './base-builder';
import { join } from 'path';
import { compile } from 'handlebars';
import { MongoInitTemplate } from '../templates/mongo/mongo-init';
import { writeFile } from 'fs/promises';
import { Service } from '../../types/docker-compose';
import { StackBuildArgs } from '../../../types/stack-build-args';

export class MongoBuilder extends BaseBuilder {
  protected getBuilderIdentifier(): string {
    return 'Mongo';
  }

  protected async buildDockerImage(): Promise<void> {
    // Mongo images not build directly
  }

  protected async writeConfigs(args: StackBuildArgs): Promise<void> {
    this.safeOnMilestoneAchieved('Writing configs');
    const baseDirectory = join(this.baseStackConfigDirectory, 'mongo');
    await this.ensureDirectoryExists(join(baseDirectory, 'scripts'));

    const initTemplate = compile(MongoInitTemplate);

    await writeFile(
      join(baseDirectory, 'scripts', '00-identity-init.js'),
      initTemplate({
        identity_user: args.credentials.identity.dbUser,
        identity_pass: args.credentials.identity.dbPassword,
      }),
    );
  }

  getDockerComposeServices(args: StackBuildArgs): Service[] {
    const configDir = join(this.baseStackConfigDirectory, 'mongo');
    return [
      {
        key: 'mongo',
        image: 'mongo',
        restart: 'always',
        environment: {
          MONGO_INITDB_ROOT_USERNAME: args.credentials.mongoRootUser,
          MONGO_INITDB_ROOT_PASSWORD: args.credentials.mongoRootPass,
        },
        ports: {
          '27017': '27017',
        },
        volumes: [
          {
            sourcePath: 'mongo-db',
            containerPath: '/data/db',
          },
          {
            sourcePath: join(configDir, 'scripts'),
            containerPath: '/docker-entrypoint-initdb.d',
            mode: 'ro',
          },
        ],
        logging: {
          driver: 'none',
        },
        networks: ['app'],
      },
    ];
  }

  constructor(baseStackConfigDirectory: string) {
    super('', baseStackConfigDirectory);
  }
}
