export const NginxConfTemplate = `events {}

stream {
    upstream backends {
{{servers}}
    }

    server {
        listen                  80;
        listen                  443 ssl;
        proxy_pass              backends;

        ssl_certificate         /etc/nginx/nginx-selfsigned.crt;
        ssl_certificate_key     /etc/nginx/nginx-selfsigned.key;
        ssl_protocols           SSLv3 TLSv1 TLSv1.1 TLSv1.2;
        ssl_session_timeout     4h;
        ssl_handshake_timeout   30s;
    }
}
`;
