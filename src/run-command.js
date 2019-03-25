import execa from 'execa';
import redisDownload from 'redis-download';
import { homedir } from 'os';

export default async function runCommand(command, args, opts) {
	const {
		env: {
			REDIS_DOWNLOADDIR: downloadDir = `${homedir()}/.redis-prebuilt`,
			REDIS_VERSION: version,
		},
	} = process;

	const directory = await redisDownload({
		downloadDir,
		version,
	});

	return { childProcess: execa(`${directory}/src/${command}`, args, opts) };
}
