import serverModule from '../dist/server/server.js';

const server = (serverModule && (serverModule.default ?? serverModule));

export default async function handler(req, res) {
	try {
		// Build a Request object from the incoming Node.js `req`
		const url = new URL(req.url, `http://${req.headers.host}`);

		let body = undefined;
		if (req.method !== 'GET' && req.method !== 'HEAD') {
			body = await new Promise((resolve, reject) => {
				const chunks = [];
				req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
				req.on('end', () => resolve(Buffer.concat(chunks)));
				req.on('error', reject);
			});
		}

		const request = new Request(url.toString(), {
			method: req.method,
			headers: req.headers,
			body,
		});

		const response = await server.fetch(request, {}, {});

		// Pipe response back to Vercel's Node `res`
		res.statusCode = response.status;
		response.headers.forEach((value, key) => res.setHeader(key, value));
		const arrayBuffer = await response.arrayBuffer();
		res.end(Buffer.from(arrayBuffer));
	} catch (err) {
		console.error(err);
		res.statusCode = 500;
		res.end('Internal Server Error');
	}
}