export type DockerComposeRoot = {
  version: string;
  services: Service[];
  networks?: string[];
  volumes?: string[];
};

export type Service = {
  key: string;
  comments?: string[];
  build?: BuildSettings;
  init?: boolean;
  image?: string;
  restart?: string;
  command?: string[];
  extraHosts?: string[];
  environment?: Record<string, string>;
  ports?: Record<string, string>;
  volumes?: VolumeMapping[];
  dependsOn?: string[];
  logging?: LoggingSettings;
  networks?: string[];
};

export type BuildSettings = {
  context?: string;
  args: Record<string, string>;
};

export type VolumeMapping = {
  type?: string;
  sourcePath: string;
  containerPath: string;
  mode?: string;
};

export type LoggingSettings = {
  driver?: string;
};
