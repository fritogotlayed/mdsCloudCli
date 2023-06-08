// NOTE: Reminder, this file should be named elasticsearch.yml
export const RegistryConfYmlTemplate = `version: 0.1
log:
  fields:
    service: registry

storage:
  cache:
    blobdescriptor: inmemory
  filesystem:
    rootdirectory: /var/lib/registry

http:
  addr: :5000
  headers:
    X-Content-Type-Options: [nosniff]

health:
  storagedriver:
    enabled: true
    interval: 10s
    threshold: 3

notifications:
  events:
    includereferences: true
  endpoints:
    - name: alistener
      url: http://mds-ns:8888/v1/emit/orid:1:mdsCloud:::1:ns:docker-registry
      headers:
        Authorization: [{{authHeader}}]
      timeout: 500ms
      threshold: 5
      backoff: 1s
`;
