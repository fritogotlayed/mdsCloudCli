import { BaseBuilder } from './base-builder';
import { Service } from '../../types/docker-compose';
import { StackBuildArgs } from '../../../types/stack-build-args';

export class RedisBuilder extends BaseBuilder {
  protected getBuilderIdentifier(): string {
    return 'Redis';
  }

  protected async buildDockerImage(): Promise<void> {
    // Redis images not build directly
  }

  protected async writeConfigs(): Promise<void> {
    // Redis configuration requires no config files
  }

  getDockerComposeServices(args: StackBuildArgs): Service[] {
    return [
      {
        key: 'redis',
        image: 'redis',
        restart: 'always',
        ports: {
          '6379': '6379',
        },
        logging: {
          driver: 'none',
        },
        networks: ['app'],
      },
    ];
  }

  constructor() {
    super('', '');
  }
}
