export default async function wait(interval) {
	return new Promise((resolve) => setTimeout(resolve, interval));
}
