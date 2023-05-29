export const ElkSetupDockerfileTemplate = `ARG ELK_VERSION

# https://www.docker.elastic.co/
FROM docker.elastic.co/elasticsearch/elasticsearch:\${ELK_VERSION}

USER root

RUN set -eux; \\
\tmkdir /state; \\
\tchmod 0775 /state; \\
\tchown elasticsearch:root /state

USER elasticsearch:root

ENTRYPOINT ["/entrypoint.sh"]
`;
