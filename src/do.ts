import { DurableObject } from 'cloudflare:workers';

// Worker
export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.url.endsWith('/websocket')) {
			// Expect to receive a WebSocket Upgrade request.
			// If there is one, accept the request and return a WebSocket Response.
			const upgradeHeader = request.headers.get('Upgrade');
			if (!upgradeHeader || upgradeHeader !== 'websocket') {
				return new Response('Durable Object expected Upgrade: websocket', { status: 426 });
			}

			let id = env.Voting.idFromName('foo');
			let stub = env.Voting.get(id);

			return stub.fetch(request);
		}

		return new Response(null, {
			status: 400,
			statusText: 'Bad Request',
			headers: {
				'Content-Type': 'text/plain',
			},
		});
	},
} satisfies ExportedHandler<Env>;

// Durable Object
export class VotingServer extends DurableObject {
	currentlyConnectedWebSockets: number;
	private clients: WebSocket[] = [];

	constructor(ctx: DurableObjectState, env: Env) {
		// This is reset whenever the constructor runs because
		// regular WebSockets do not survive Durable Object resets.
		//
		// WebSockets accepted via the Hibernation API can survive
		// a certain type of eviction, but we will not cover that here.
		super(ctx, env);
		this.currentlyConnectedWebSockets = 0;
	}

	async fetch(request: Request): Promise<Response> {
		// Creates two ends of a WebSocket connection.
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		// Calling `accept()` tells the runtime that this WebSocket is to begin terminating
		// request within the Durable Object. It has the effect of "accepting" the connection,
		// and allowing the WebSocket to send and receive messages.
		server.accept();
		this.clients.push(server);
		this.currentlyConnectedWebSockets += 1;

		// Upon receiving a message from the client, the server replies with the same message,
		// and the total number of connections with the "[Durable Object]: " prefix
		server.addEventListener('message', (event: MessageEvent) => {
			const message = JSON.parse(event.data.toString());
			if (message.type === 'vote') {
				this.clients.forEach((ws) => {
					ws.send(JSON.stringify({ type: 'vote', data: message.data }));
				});
			}
		});

		// If the client closes the connection, the runtime will close the connection too.
		server.addEventListener('close', (cls: CloseEvent) => {
			this.currentlyConnectedWebSockets -= 1;
			server.close(cls.code, 'Durable Object is closing WebSocket');
		});

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}
}
