import WebSocket from 'ws';
import http from 'http';
import * as bson from 'bson';
import { v4 as uuid_v4 } from 'uuid';
import { ws_packet_type } from './types';

type ws_pending_type = {
	id: number,
	resolve: (p_ws_packet: ws_packet_type) => void,
	reject: (p_ws_packet: ws_packet_type) => void
	dts: number
};

export class ws_server {

	wss: WebSocket.Server;
	public http_server: http.Server;

	ws_handlers: { [name: string]: (p_ws_packet: ws_packet_type, p_context: any) => Promise<ws_packet_type> };

	constructor(p_http_server?: http.Server) {

		this.ws_handlers = {};

		this.http_server = p_http_server ?? http.createServer();

		this.wss = new WebSocket.Server({

			server: this.http_server,
			perMessageDeflate: false,
			maxPayload: 0, //(1024 * 1024) * 20
			/*
			port: 8080,
			perMessageDeflate: {
				zlibDeflateOptions: {
					// See zlib defaults.
					chunkSize: 1024,
					memLevel: 7,
					level: 3
				},
				zlibInflateOptions: {
					chunkSize: 10 * 1024
				},
				// Other options settable:
				clientNoContextTakeover: true, // Defaults to negotiated value.
				serverNoContextTakeover: true, // Defaults to negotiated value.
				serverMaxWindowBits: 10, // Defaults to negotiated value.
				// Below options specified as default values.
				concurrencyLimit: 10, // Limits zlib concurrency for perf.
				threshold: 1024 // Size (in bytes) below which messages
				// should not be compressed.
    
			}
			*/
		});

		this.wss.on('connection', this.on_connection.bind(this));

		/*
		this.http_server.listen(80, () => {
			console.log('http/websocket server started');
		});
		*/

		/*
		setInterval(() => {
			const v_ws_packet: ws_packet_type = { action: 'ping', };
			this.wss.clients.forEach(p_ws => this.send_ws_packet(p_ws, v_ws_packet));
		}, 5000);
		*/

		/*
		setInterval(() => {
			const v_ws_packet: ws_packet_type = { action: 'notification', };
			this.wss.clients.forEach(p_ws => this.send_ws_packet(p_ws, v_ws_packet));
		}, 5000);
		*/

	}

	add_handler(p_name: string, p_handler: (p_ws_packet: ws_packet_type, p_context: any) => Promise<ws_packet_type>) {
		this.ws_handlers[p_name] = p_handler;
	}

	context_list: { [name: string]: any }[] = [];

	on_connection(p_ws: WebSocket, p_req: http.IncomingMessage) {

		const v_context = {
			id: uuid_v4(),
			authorized: false,
			dts: new Date()
		}

		this.context_list[v_context.id] = v_context;

		p_ws.binaryType = 'arraybuffer';

		//this.context_list[ p_ws.]

		p_ws.on('message', async p_message => {

			if (p_message instanceof ArrayBuffer) {

				const v_ws_packet = <ws_packet_type>bson.deserialize(p_message, { allowObjectSmallerThanBufferSize: true });

				if (!v_context.authorized && v_ws_packet.action !== 'authorize') {
					console.error(`${v_context.id} - not authorized`);
					this.send_ws_packet(p_ws, { ...v_ws_packet, successful: false, data: 'not authorized' });
					return;
				}

				console.log(v_ws_packet.action);

				const v_handler_async = this.ws_handlers[v_ws_packet.action];

				if (v_handler_async) {
					const v_ws_packet_response = await v_handler_async(v_ws_packet, v_context);
					this.send_ws_packet(p_ws, v_ws_packet_response);
				} else {
					console.error('unknown action: ' + v_ws_packet.action);
				}

			} else {

				debugger;

			}

			console.log(v_context);
			console.log('received: ' + p_message);
		});

		const v_user_id = uuid_v4();

		console.log('new connection');

		const v_ws_packet: ws_packet_type = {
			action: 'welcome',
			data: {
				user_id: v_user_id
			}
		};

		this.send_ws_packet(p_ws, v_ws_packet);
	}

	send_ws_packet(p_ws: WebSocket, p_ws_packet: ws_packet_type) {
		const v_bson = bson.serialize(p_ws_packet);
		p_ws.send(v_bson);
	}

	fault(p_opticalroute: string, p_distance: number) {
		const v_ws_packet: ws_packet_type = { action: 'fault', data: { opticalroute: p_opticalroute, distance: p_distance } };
		this.wss.clients.forEach(p_ws => this.send_ws_packet(p_ws, v_ws_packet));
	}

	notification(p_data: any) {
		const v_ws_packet: ws_packet_type = { action: 'notification', data: p_data };
		this.wss.clients.forEach(p_ws => this.send_ws_packet(p_ws, v_ws_packet));
	}
}

/*
const ws_server_singleton = new ws_server_class();
export const ws_server = ws_server_singleton;
*/