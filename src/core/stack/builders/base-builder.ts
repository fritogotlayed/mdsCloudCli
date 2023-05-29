import { Service } from '../../types/docker-compose';
import { mkdir } from 'fs/promises';
import { StackBuildArgs } from '../../../types/stack-build-args';

export interface IServiceBuilder {
  onStatusUpdate?: (string) => void;
  onMilestoneAchieved?: (string) => void;
  build(args: StackBuildArgs): void;
}
export abstract class BaseBuilder implements IServiceBuilder {
  public onMilestoneAchieved: (string) => void;
  public onStatusUpdate: (string) => void;
  protected sourceDirectory: string;
  protected baseStackConfigDirectory: string;

  protected safeOnStatusUpdate(message: string) {
    if (this.onStatusUpdate) {
      this.onStatusUpdate(`${this.getBuilderIdentifier()}: ${message}`);
    }
  }

  protected safeOnMilestoneAchieved(message: string) {
    if (this.onMilestoneAchieved) {
      this.onMilestoneAchieved(`${this.getBuilderIdentifier()}: ${message}`);
    }
  }

  protected async ensureDirectoryExists(path: string): Promise<void> {
    await mkdir(path, {
      recursive: true,
    });
  }

  protected abstract getBuilderIdentifier(): string;
  protected abstract buildDockerImage(args: StackBuildArgs): Promise<void>;
  protected abstract writeConfigs(args: StackBuildArgs): Promise<void>;

  protected constructor(
    sourceDirectory: string,
    baseStackConfigDirectory: string,
  ) {
    this.sourceDirectory = sourceDirectory;
    this.baseStackConfigDirectory = baseStackConfigDirectory;
  }

  public abstract getDockerComposeServices(
    args: Record<string, unknown>,
  ): Service[];

  public async build(args: StackBuildArgs): Promise<void> {
    await this.buildDockerImage(args);
    await this.writeConfigs(args);
  }
}
