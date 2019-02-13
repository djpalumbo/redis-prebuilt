#!/usr/bin/env node
import runCommand from './run-command';

runCommand('redis-server', process.argv.slice(2))
	.catch((err) => {
		console.error(err); // eslint-disable-line no-console

		process.exit(1);
	});
