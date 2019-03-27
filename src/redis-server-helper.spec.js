import wait from './wait';
import runCommand from './run-command';
import { RedisServerHelper } from './redis-server-helper';

jest.mock('./wait');
jest.mock('./run-command');

describe('redis-server-helper', () => {
	beforeEach(() => {
		wait.mockResolvedValue();

		runCommand.mockImplementation((command) => new Promise((resolve) => {
			if (command === 'redis-server') {
				resolve({ childProcess: { kill: () => 'kill' } });
			} else if (command === 'redis-cli') {
				resolve({ childProcess: { stdout: 'PONG' } });
			}
		}));
	});

	afterEach(() => {
		delete process.env.REDIS_DOWNLOADDIR;
		delete process.env.REDIS_VERSION;

		jest.resetAllMocks();
	});

	it('allows stop() and kill() before run() is called', async () => {
		const redisServer = new RedisServerHelper();

		redisServer.stop();
		redisServer.kill();
	});

	it('runs redis-server defaults', async () => {
		const redisServer = new RedisServerHelper();

		await redisServer.run();

		expect(runCommand).toHaveBeenCalledWith('redis-server', [], { detached: true });
		expect(wait).toHaveBeenCalledWith(60);
		expect(runCommand).toHaveBeenCalledWith('redis-cli', ['-p', 6379, '-r', '1', 'PING']);
	});

	it('runs redis-server with args and opts', async () => {
		const redisServer = new RedisServerHelper(['arg1', 'arg2'], {
			downloadDir: 'path/to/dir',
			version:     'x.y.z',
		});

		expect(process.env.REDIS_DOWNLOADDIR).toBe('path/to/dir');
		expect(process.env.REDIS_VERSION).toBe('x.y.z');

		await redisServer.run();

		expect(runCommand).toHaveBeenCalledWith('redis-server', ['arg1', 'arg2'], { detached: true });
		expect(wait).toHaveBeenCalledWith(60);
		expect(runCommand).toHaveBeenCalledWith('redis-cli', ['-p', 6379, '-r', '1', 'PING']);
	});

	it('runs redis-server with empty args & opts', async () => {
		const redisServer = new RedisServerHelper([], {});

		await redisServer.run();

		expect(process.env.REDIS_DOWNLOADDIR).toBe(undefined);
		expect(process.env.REDIS_VERSION).toBe(undefined);

		expect(runCommand).toHaveBeenCalledWith('redis-server', [], { detached: true });
		expect(wait).toHaveBeenCalledWith(60);
		expect(runCommand).toHaveBeenCalledWith('redis-cli', ['-p', 6379, '-r', '1', 'PING']);

		redisServer.stop();
		redisServer.kill();
	});

	it('runs redis-server with a different port', async () => {
		const redisServer = new RedisServerHelper(['--port', 1234]);

		await redisServer.run();

		expect(runCommand).toHaveBeenCalledWith('redis-server', ['--port', 1234], { detached: true });
		expect(wait).toHaveBeenCalledWith(60);
		expect(runCommand).toHaveBeenCalledWith('redis-cli', ['-p', 1234, '-r', '1', 'PING']);
	});

	it('fails on timeout', async () => {
		runCommand.mockImplementation((command) => new Promise((resolve, reject) => {
			if (command === 'redis-server') {
				resolve({ childProcess: { kill: () => 'kill' } });
			} else if (command === 'redis-cli') {
				reject();
			}
		}));

		expect.assertions(5);

		const redisServer = new RedisServerHelper();

		try {
			await redisServer.run();
		} catch (err) {
			expect(runCommand).toHaveBeenCalledTimes(11);
			expect(runCommand).toHaveBeenCalledWith('redis-server', [], { detached: true });
			expect(wait).toHaveBeenCalledTimes(10);
			expect(wait).toHaveBeenLastCalledWith(60 * (2 ** 9));
			expect(runCommand).toHaveBeenLastCalledWith('redis-cli', ['-p', 6379, '-r', '1', 'PING']);
		}
	});

	it('fails with invalid args', () => {
		expect.assertions(1);
		try {
			new RedisServerHelper('notArgs'); // eslint-disable-line no-new
		} catch (err) {
			expect(err.message).toBe('Invalid value for args');
		}
	});

	it('fails with invalid port number in args', () => {
		expect.assertions(1);
		try {
			new RedisServerHelper(['--port', -1]); // eslint-disable-line no-new
		} catch (err) {
			expect(err.message).toBe('Invalid port in args');
		}
	});

	it('fails with invalid opts', () => {
		expect.assertions(1);
		try {
			new RedisServerHelper(undefined, 'notOpts'); // eslint-disable-line no-new
		} catch (err) {
			expect(err.message).toBe('Invalid value for opts');
		}
	});

	it('fails with invalid key in opts', () => {
		expect.assertions(1);
		try {
			new RedisServerHelper(undefined, { badKey: true }); // eslint-disable-line no-new
		} catch (err) {
			expect(err.message).toBe('Invalid key in opts');
		}
	});
});
