#!/usr/bin/env node
import runCommand from './run-command';

runCommand('redis-check-aof', process.argv.slice(2), { stdio: 'inherit' })
	.catch((err) => { // eslint-disable-line promise/prefer-await-to-callbacks
		console.error(err); // eslint-disable-line no-console

		process.exit(1);
	});
