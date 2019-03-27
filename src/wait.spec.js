import wait from './wait';

describe('wait', () => {
	it('resolves in a given amount of time', async () => {
		jest.useFakeTimers();
		Promise.resolve() // eslint-disable-line promise/catch-or-return
			.then(() => jest.advanceTimersByTime(10)); // eslint-disable-line promise/prefer-await-to-then
		await wait(10);
	});
});
