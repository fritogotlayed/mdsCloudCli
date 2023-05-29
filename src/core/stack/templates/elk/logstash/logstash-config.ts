// NOTE: Reminder, this file should be named elasticsearch.yml
export const ElkLogstashConfigTemplate = `input {
	tcp {
		port => 6000
	}
	udp {
		port => 6001
	}
	http {
		port => 6002
	}
}

filter {
	json {
		source => "message"
		skip_on_invalid_json => true
	}
}

## Add your filters / logstash plugins configuration here

output {
	elasticsearch {
		hosts => "elasticsearch:9200"
		user => "elastic"
		password => "changeme"
	}
}
`;
