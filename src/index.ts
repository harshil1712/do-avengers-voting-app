import { routePartykitRequest, Server, type Connection, type WSMessage } from 'partyserver';
// Define your Server
export class VotingServer extends Server {
	// store the data in memory
	choice: Record<string, number> = {};
	// use the KV storage for persistent storage
	kv = this.ctx.storage;
	async onConnect(connection: Connection) {
		console.log('Connected', connection.id, 'to server', this.name);
		// const votes = (await this.kv.get('fav-avengers')) || {};
		// connection.send(JSON.stringify({ type: 'result', results: votes }));
		// connection.send(JSON.stringify({ type: 'result', results: this.choice }));
	}

	async onMessage(connection: Connection, message: WSMessage) {
		const m: { type: string; choice: string } = JSON.parse(message.toString());
		if (m.type === 'vote') {
			// const votes: Record<string, number> = (await this.kv.get('fav-avengers')) || {};
			// votes[m.choice] = (votes[m.choice] || 0) + 1;
			// await this.kv.put('fav-avengers', votes);
			// this.broadcast(JSON.stringify({ type: 'result', results: votes }));

			// this.choice[m.choice] = (this.choice[m.choice] || 0) + 1;
			this.broadcast(JSON.stringify({ type: 'result', results: this.choice }));
		}
	}
}

export default {
	// Set up your fetch handler to use configured Servers
	fetch(request: Request, env: any) {
		return routePartykitRequest(request, env) || new Response('Not Found', { status: 404 });
	},
};
