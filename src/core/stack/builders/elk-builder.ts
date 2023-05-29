import { BaseBuilder } from './base-builder';
import { join } from 'path';
import { chmod, writeFile } from 'fs/promises';
import { compile } from 'handlebars';
import { ElkSetupDockerfileTemplate } from '../templates/elk/setup/dockerfile';
import { ElkSetupEntrypointShTemplate } from '../templates/elk/setup/entrypoint-sh';
import { ElkSetupLibShTemplate } from '../templates/elk/setup/lib-sh';
import { ElkElasticsearchDockerfileTemplate } from '../templates/elk/elasticsearch/dockerfile';
import { ElkElasticsearchConfigYmlTemplate } from '../templates/elk/elasticsearch/config-yml';
import { ElkLogstashDockerfileTemplate } from '../templates/elk/logstash/dockerfile';
import { ElkLogstashConfigTemplate } from '../templates/elk/logstash/logstash-config';
import { ElkLogstashYmlTemplate } from '../templates/elk/logstash/logstash-yml';
import { ElkKibanaDockerfileTemplate } from '../templates/elk/kibana/dockerfile';
import { ElkKibanaConfigTemplate } from '../templates/elk/kibana/config-yml';
import { Service } from '../../types/docker-compose';

export class ElkBuilder extends BaseBuilder {
  protected getBuilderIdentifier(): string {
    return 'ELK Stack';
  }

  async #writeSetupConfigs(): Promise<void> {
    this.safeOnStatusUpdate('Writing ELK Stack setup configs');
    const baseDirectory = join(this.baseStackConfigDirectory, 'elk', 'setup');

    const dockerfileTemplate = compile(ElkSetupDockerfileTemplate);
    const entrypointTemplate = compile(ElkSetupEntrypointShTemplate);
    const libTemplate = compile(ElkSetupLibShTemplate);

    await Promise.all([
      writeFile(join(baseDirectory, 'Dockerfile'), dockerfileTemplate({})),
      writeFile(join(baseDirectory, 'entrypoint.sh'), entrypointTemplate({})),
      writeFile(join(baseDirectory, 'lib.sh'), libTemplate({})),
    ]);

    await Promise.all([
      chmod(join(baseDirectory, 'entrypoint.sh'), 0o774),
      chmod(join(baseDirectory, 'lib.sh'), 0o774),
    ]);
  }

  async #writeElasticSearchConfigs(): Promise<void> {
    this.safeOnStatusUpdate('Writing ELK Elasticsearch setup configs');
    const baseDirectory = join(
      this.baseStackConfigDirectory,
      'elk',
      'elasticsearch',
    );

    const dockerfileTemplate = compile(ElkElasticsearchDockerfileTemplate);
    const configTemplate = compile(ElkElasticsearchConfigYmlTemplate);

    await Promise.all([
      writeFile(join(baseDirectory, 'Dockerfile'), dockerfileTemplate({})),
      writeFile(join(baseDirectory, 'elasticsearch.yml'), configTemplate({})),
    ]);
  }

  async #writeLogstashConfigs(): Promise<void> {
    this.safeOnStatusUpdate('Writing ELK Logstash setup configs');
    const baseDirectory = join(
      this.baseStackConfigDirectory,
      'elk',
      'logstash',
    );

    const dockerfileTemplate = compile(ElkLogstashDockerfileTemplate);
    const configTemplate = compile(ElkLogstashConfigTemplate);
    const ymlTemplate = compile(ElkLogstashYmlTemplate);

    await Promise.all([
      writeFile(join(baseDirectory, 'Dockerfile'), dockerfileTemplate({})),
      writeFile(join(baseDirectory, 'logstash.conf'), configTemplate({})),
      writeFile(join(baseDirectory, 'logstash.yml'), ymlTemplate({})),
    ]);
  }

  async #writeKibanaConfigs(): Promise<void> {
    this.safeOnStatusUpdate('Writing ELK Kibana setup configs');
    const baseDirectory = join(this.baseStackConfigDirectory, 'elk', 'kibana');

    const dockerfileTemplate = compile(ElkKibanaDockerfileTemplate);
    const configTemplate = compile(ElkKibanaConfigTemplate);

    await Promise.all([
      writeFile(join(baseDirectory, 'Dockerfile'), dockerfileTemplate({})),
      writeFile(join(baseDirectory, 'kibana.yml'), configTemplate({})),
    ]);
  }

  getDockerComposeServices(): Service[] {
    const buildArgs = {
      ELK_VERSION: '8.6.2',
    };
    const setupConfigDir = join(this.baseStackConfigDirectory, 'elk', 'setup');
    const elasticsearchConfigDir = join(
      this.baseStackConfigDirectory,
      'elk',
      'elasticsearch',
    );
    const logstashConfigDir = join(
      this.baseStackConfigDirectory,
      'elk',
      'logstash',
    );
    const kibanaConfigDir = join(
      this.baseStackConfigDirectory,
      'elk',
      'kibana',
    );

    return [
      {
        key: 'elk-setup',
        comments: [
          'Reference: https://github.com/deviantony/docker-elk',
          '',
          'The "setup" service runs a one-off script which initializes users inside',
          'Elasticsearch — such as "logstash_internal" and "kibana_system" — with the',
          'values of the passwords defined in the ".env" file.',
          '',
          'This task is only performed during the *initial* startup of the stack. On all',
          'subsequent runs, the service simply returns immediately, without performing',
          'any modification to existing users.',
        ],
        build: {
          context: `${setupConfigDir}/`,
          args: buildArgs,
        },
        init: true,
        volumes: [
          {
            sourcePath: join(setupConfigDir, 'entrypoint.sh'),
            containerPath: '/entrypoint.sh',
            mode: 'ro,Z',
          },
          {
            sourcePath: join(setupConfigDir, 'lib.sh'),
            containerPath: '/lib.sh',
            mode: 'ro,Z',
          },
          {
            sourcePath: 'elasticsearch-setup-roles',
            containerPath: '/roles', // For potential future expansion
            mode: 'ro,Z',
          },
          {
            sourcePath: 'elasticsearch-setup-state',
            containerPath: '/state',
            mode: 'Z',
          },
        ],
        environment: {
          ELASTIC_PASSWORD: '${ELASTIC_PASSWORD:-changeme}',
          LOGSTASH_INTERNAL_PASSWORD: '${LOGSTASH_INTERNAL_PASSWORD:-changeme}',
          KIBANA_SYSTEM_PASSWORD: '${KIBANA_SYSTEM_PASSWORD:-changeme}',
          METRICBEAT_INTERNAL_PASSWORD:
            '${METRICBEAT_INTERNAL_PASSWORD:-changeme}',
          FILEBEAT_INTERNAL_PASSWORD: '${FILEBEAT_INTERNAL_PASSWORD:-changeme}',
          HEARTBEAT_INTERNAL_PASSWORD:
            '${HEARTBEAT_INTERNAL_PASSWORD:-changeme}',
          MONITORING_INTERNAL_PASSWORD:
            '${MONITORING_INTERNAL_PASSWORD:-changeme}',
          BEATS_SYSTEM_PASSWORD: '${BEATS_SYSTEM_PASSWORD:-changeme}',
        },
        networks: ['app'],
        dependsOn: ['elasticsearch'],
      },
      {
        key: 'elasticsearch',
        build: {
          context: `${elasticsearchConfigDir}/`,
          args: buildArgs,
        },
        restart: 'always',
        volumes: [
          {
            sourcePath: join(elasticsearchConfigDir, 'elasticsearch.yml'),
            containerPath: '/usr/share/elasticsearch/config/elasticsearch.yml',
            mode: 'ro',
          },
          {
            sourcePath: 'elasticsearch',
            containerPath: '/usr/share/elasticsearch/data',
          },
        ],
        ports: {
          '9200': '9200',
          '9300': '9300',
        },
        environment: {
          ES_JAVA_OPTS: '-Xmx256m -Xms256m',
          // Use single node discovery in order to disable production mode and avoid boostrap checks
          // see https://www.elastic.co/guide/en/elasticsearch/reference/current/bootstrap-checks.html
          'discovery.type': 'single-node',
          ELASTIC_PASSWORD: '${ELASTIC_PASSWORD:-changeme}',
        },
        logging: {
          driver: 'none',
        },
        networks: ['app'],
      },
      {
        key: 'logstash',
        build: {
          context: `${logstashConfigDir}/`,
          args: buildArgs,
        },
        restart: 'always',
        volumes: [
          {
            sourcePath: join(logstashConfigDir, 'logstash.yml'),
            containerPath: '/usr/share/logstash/config/logstash.yml',
            mode: 'ro',
          },
          {
            sourcePath: join(logstashConfigDir, 'logstash.conf'),
            containerPath: '/usr/share/logstash/pipeline/logstash.conf',
            mode: 'ro',
          },
        ],
        ports: {
          '6000': '6000',
          '6001': '6001',
          '6002': '6002',
          '9600': '9600',
        },
        environment: {
          LS_JAVA_OPTS: '-Xmx256m -Xms256m',
        },
        dependsOn: ['elasticsearch'],
        logging: {
          driver: 'none',
        },
        networks: ['app'],
      },
      {
        key: 'kibana',
        build: {
          context: `${kibanaConfigDir}/`,
          args: buildArgs,
        },
        restart: 'always',
        volumes: [
          {
            sourcePath: join(kibanaConfigDir, 'kibana.yml'),
            containerPath: '/usr/share/kibana/config/kibana.yml',
            mode: 'ro',
          },
        ],
        ports: {
          '5601': '5601',
        },
        dependsOn: ['logstash', 'elasticsearch'],
        logging: {
          driver: 'none',
        },
        networks: ['app'],
      },
    ];
  }

  protected async buildDockerImage(): Promise<void> {
    // ELK images not build directly
  }

  protected async writeConfigs(): Promise<void> {
    this.safeOnMilestoneAchieved('Writing configs');
    await Promise.all([
      this.ensureDirectoryExists(
        join(this.baseStackConfigDirectory, 'elk', 'setup'),
      ),
      this.ensureDirectoryExists(
        join(this.baseStackConfigDirectory, 'elk', 'elasticsearch'),
      ),
      this.ensureDirectoryExists(
        join(this.baseStackConfigDirectory, 'elk', 'logstash'),
      ),
      this.ensureDirectoryExists(
        join(this.baseStackConfigDirectory, 'elk', 'kibana'),
      ),
    ]);

    await Promise.all([
      this.#writeSetupConfigs(),
      this.#writeElasticSearchConfigs(),
      this.#writeLogstashConfigs(),
      this.#writeKibanaConfigs(),
    ]);
  }

  public constructor(baseStackConfigDirectory: string) {
    super('', baseStackConfigDirectory);
  }
}
