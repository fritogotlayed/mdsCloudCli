import { BaseBuilder } from './base-builder';
import { join } from 'path';
import { Service } from '../../types/docker-compose';
import { StackBuildArgs } from '../../../types/stack-build-args';
import { generateRandomString } from '../../../utils/generate-random-string';
import { chmod, writeFile } from 'fs/promises';
import { ChildProcess } from '../../../utils/child-process';
import { compile } from 'handlebars';
import { NginxConfTemplate } from '../templates/identity/nginx-conf';
import { AppConfTemplate } from '../templates/identity/app-config';
import { EntryPointTemplate } from '../templates/identity/entry-point';
import { homedir } from 'os';
import { LocalDevConfTemplate } from '../templates/identity/localdev-config';

export class IdentityBuilder extends BaseBuilder {
  protected getBuilderIdentifier(): string {
    return 'Identity';
  }

  protected async buildDockerImage(args: StackBuildArgs): Promise<void> {
    if (args.config.identity === 'local') {
      const imageBuildTask = new ChildProcess({
        command: 'docker build -t local/mds-cloud-identity:latest .',
        workingDir: this.sourceDirectory,
        logFile: join(
          homedir(),
          '.mds',
          'stack',
          'logs',
          'identityDockerBuild.log',
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
        `Bypassing container build due to ${args.config.identity} configuration`,
      );
    }
  }

  protected async writeConfigs(args: StackBuildArgs): Promise<void> {
    this.safeOnMilestoneAchieved('Writing configs');
    const privateKeyPassword = generateRandomString(12);
    await Promise.all([
      this.ensureDirectoryExists(
        join(this.baseStackConfigDirectory, 'identity', 'keys'),
      ),
      this.ensureDirectoryExists(
        join(this.baseStackConfigDirectory, 'identity', 'proxy'),
      ),
      this.ensureDirectoryExists(
        join(this.baseStackConfigDirectory, 'identity', 'config'),
      ),
    ]);

    this.safeOnStatusUpdate('Generating SSH keys for identity service (pass)');
    await writeFile(
      join(this.baseStackConfigDirectory, 'identity', 'keys', 'pass'),
      privateKeyPassword,
    );

    this.safeOnStatusUpdate(
      'Generating SSH keys for identity service (private ssh key)',
    );
    const privateSshKeyGenProcess = new ChildProcess({
      command: `ssh-keygen -f ./key -t rsa -b 4096 -m PKCS8 -n ${privateKeyPassword} -N ${privateKeyPassword}`,
      workingDir: join(this.baseStackConfigDirectory, 'identity', 'keys'),
    });
    await privateSshKeyGenProcess.execute();

    this.safeOnStatusUpdate(
      'Generating SSH keys for identity service (public ssh key pem)',
    );
    const publicSshKeyGenProcess = new ChildProcess({
      command: 'ssh-keygen -f ./key.pub -e -m pem',
      workingDir: join(this.baseStackConfigDirectory, 'identity', 'keys'),
      logFile: join(
        this.baseStackConfigDirectory,
        'identity',
        'keys',
        'key.pub.pem',
      ),
    });
    await publicSshKeyGenProcess.execute();

    this.safeOnStatusUpdate(
      'Generating SSH keys for identity service (openssl certs)',
    );
    const publicSshCertsProcess = new ChildProcess({
      command:
        'openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx-selfsigned.key -out nginx-selfsigned.crt -batch -subj /',
      workingDir: join(this.baseStackConfigDirectory, 'identity', 'proxy'),
    });
    await publicSshCertsProcess.execute();

    this.safeOnStatusUpdate('Generating NGINX config');
    const nginxConfTemplate = compile(NginxConfTemplate);
    await writeFile(
      join(this.baseStackConfigDirectory, 'identity', 'proxy', 'nginx.conf'),
      nginxConfTemplate({
        // TODO: Handle multiple servers
        servers:
          args.config.identity === 'localDev'
            ? '        server host.docker.internal:8888;'
            : '        server mds-identity-1:8888;',
      }),
    );

    if (args.config.identity === 'localDev') {
      this.safeOnStatusUpdate('Generating localdev app config');
      const localDevConfTemplate = compile(LocalDevConfTemplate);
      await writeFile(
        join(this.sourceDirectory, 'config', 'localdev.js'),
        localDevConfTemplate({
          db_conn_string: `mongodb://${args.credentials.mongoRootUser}:${args.credentials.mongoRootPass}@localhost:27017/mds-identity`,
          private_key_path: join(
            this.baseStackConfigDirectory,
            'identity',
            'keys',
            'key',
          ),
          private_key_pass: privateKeyPassword,
          public_key_path: join(
            this.baseStackConfigDirectory,
            'identity',
            'keys',
            'key.pub.pem',
          ),
          system_pass: args.settings.defaultAdminPassword,
        }),
      );
    } else {
      this.safeOnStatusUpdate('Generating override app config');
      const appConfTemplate = compile(AppConfTemplate);
      await writeFile(
        join(this.baseStackConfigDirectory, 'identity', 'config', 'local.js'),
        appConfTemplate({
          db_conn_string: `mongodb://${args.credentials.mongoRootUser}:${args.credentials.mongoRootPass}@mongo:27017/mds-identity`,
          private_key_pass: privateKeyPassword,
          sys_password: args.settings.defaultAdminPassword,
        }),
      );

      this.safeOnStatusUpdate('Generating entrypoint script');
      const entryPointTemplate = compile(EntryPointTemplate);
      await writeFile(
        join(this.baseStackConfigDirectory, 'identity', 'entry-point.sh'),
        entryPointTemplate({}),
      );

      await chmod(
        join(this.baseStackConfigDirectory, 'identity', 'entry-point.sh'),
        0o774,
      );
    }
  }

  getDockerComposeServices(args: StackBuildArgs): Service[] {
    const configDir = join(this.baseStackConfigDirectory, 'identity');
    const services: Service[] = [];
    const imageLookup = {
      // NOTE: Stable is the default
      latest: 'mdscloud/mds-cloud-identity:latest',
      local: 'local/mds-cloud-identity:latest',
    };

    const proxyService: Service = {
      key: 'mds-identity-proxy',
      image: 'nginx',
      restart: 'always',
      ports: {
        // HACK / NOTE: It is best not to include this in non local-development environments.
        '8079': '80',
        '8081': '443',
      },
      volumes: [
        {
          sourcePath: join(configDir, 'proxy', 'nginx.conf'),
          containerPath: '/etc/nginx/nginx.conf',
          mode: 'ro',
        },
        {
          sourcePath: join(configDir, 'proxy', 'nginx-selfsigned.crt'),
          containerPath: '/etc/nginx/nginx-selfsigned.crt',
          mode: 'ro',
        },
        {
          sourcePath: join(configDir, 'proxy', 'nginx-selfsigned.key'),
          containerPath: '/etc/nginx/nginx-selfsigned.key',
          mode: 'ro',
        },
      ],
      logging: {
        driver: 'none',
      },
      networks: ['app'],
    };

    services.push(proxyService);
    if (args.config.identity === 'localDev') {
      // Loop back to the host machine for testing :-)
      proxyService.extraHosts = ['host.docker.internal:host-gateway'];
    } else {
      services.push({
        key: 'mds-identity-1',
        image:
          imageLookup[args.config.identity] ??
          'mdscloud/mds-cloud-identity:stable',
        restart: 'always',
        environment: {
          MDS_SYS_PASSWORD: args.settings.defaultAdminPassword,
          MDS_SDK_VERBOSE: 'true',
        },
        command: ['./entry-point.sh'],
        volumes: [
          {
            sourcePath: join(this.baseStackConfigDirectory, 'identity', 'keys'),
            containerPath: '/root/keys',
            mode: 'ro',
          },
          {
            sourcePath: join(
              this.baseStackConfigDirectory,
              'identity',
              'config',
              'local.js',
            ),
            containerPath: '/usr/src/app/config/local.js',
            mode: 'ro',
          },
          {
            sourcePath: join(
              this.baseStackConfigDirectory,
              'identity',
              'entry-point.sh',
            ),
            containerPath: '/usr/src/app/entry-point.sh',
          },
        ],
        dependsOn: ['mongo', 'logstash'],
        networks: ['app'],
      });
    }

    return services;
  }

  constructor(sourceDirectory: string, baseStackConfigDirectory: string) {
    super(sourceDirectory, baseStackConfigDirectory);
  }
}
