export const EntryPointTemplate = `#!/usr/bin/env sh

ping -c 1 logstash
LOGSTASH_IP=$(arp | grep logstash | sed -n 's/^.* (\\(.*\\)) .*$/\\1/p')

while [ "$LOGSTASH_IP" = "" ]
do
    sleep 1
    ping -c 1
    echo $(arp)
    LOGSTASH_IP=$(arp | grep logstash | sed -n 's/^.* (\\(.*\\)) .*$/\\1/p')
done

echo "LOGSTASH_IP: $LOGSTASH_IP"
# node /usr/src/app/server.js | ./node_modules/.bin/pino-socket -a $LOGSTASH_IP -p 6000 -m tcp

rm -rf ./.mds-log-pumprc
echo "{
  \\"source\\":\\"pino\\",
  \\"pump\\":\\"logstashHttp\\",
  \\"mode\\":\\"http\\",
  \\"host\\":\\"$LOGSTASH_IP\\",
  \\"port\\":6002,
  \\"echo\\":true
}" > ./.mds-log-pumprc

node /usr/src/app/server.js | ./node_modules/.bin/mds-log-pump
`;
