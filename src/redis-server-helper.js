import wait from './wait';
import runCommand from './run-command';

function containsValidPort(args) {
	const flag = args.indexOf('--port');
	if (flag > -1 && flag + 1 < args.length) {
		const port = args[flag + 1];
		if (typeof port !== 'number' || port < 0 || port > 65535) {
			return false;
		}
	}
	return true;
}

function getPort(args) {
	const flag = args.indexOf('--port');
	return flag > -1 ? args[flag + 1] : 6379;
}

async function checkIfReady(args) {
	const port = getPort(args);

	try {
		const { childProcess } = await runCommand('redis-cli', [
			'-p', port,
			'-r', '1', 'PING',
		]);

		const { stdout } = await childProcess;
		return stdout === 'PONG';
	} catch (err) {
		return false;
	}
}

async function waitUntilReady(tries, interval, backoff, args) {
	if (tries <= 0) throw new Error('Timed out');

	await wait(interval);

	const ready = await checkIfReady(args);
	if (ready) return true;

	return waitUntilReady(tries - 1, interval * backoff, backoff, args);
}

export class RedisServerHelper {
	constructor(args, opts) {
		if (Array.isArray(args)) {
			if (!containsValidPort(args)) {
				throw new Error('Invalid port in args');
			}

			this.args = args;
		} else if (typeof args === 'undefined') {
			this.args = [];
		} else {
			throw new Error('Invalid value for args');
		}

		if (typeof opts === 'object') {
			if (!Object.keys(opts).every((e) => ['downloadDir', 'version'].includes(e))) {
				throw new Error('Invalid key in opts');
			}

			if ('downloadDir' in opts) process.env.REDIS_DOWNLOADDIR = opts.downloadDir;
			if ('version' in opts) process.env.REDIS_VERSION = opts.version;
			this.opts = opts;
		} else if (typeof opts === 'undefined') {
			this.opts = {};
		} else {
			throw new Error('Invalid value for opts');
		}
	}
	async run() {
		try {
			const {
				childProcess,
			} = await runCommand('redis-server', this.args, { detached: true });

			this.redisServer = childProcess;

			await waitUntilReady(10, 60, 2.0, this.args);
		} catch (err) {
			this.kill();
			throw err;
		}
	}
	stop() {
		if (this.redisServer) this.redisServer.kill('SIGINT');
	}
	kill() {
		if (this.redisServer) this.redisServer.kill('SIGTERM');
	}
}
