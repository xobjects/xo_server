import { OverpassQuery } from 'overpass.js';
import fastify from 'fastify';
import fastify_compress from 'fastify-compress';
import fastify_static from 'fastify-static';
import fastify_plugin from 'fastify-plugin';

import fs from 'fs';

import pg from 'pg';
import path from 'path';

import { xo } from './xo';
import layer from './layer';
import { layerset } from './layerset';
import { bookmark } from './bookmark';
import { user } from './user';

import fastifyCors from 'fastify-cors';
import db from './db';

//import { geocode, geocode2_async } from './geocode';

import { db_base } from './db_base';

import { ws_server } from './ws_server';
import { layer_row, ws_context, ws_packet_type } from './types';

import app from './app';
import geocode from './geocode';
import { delay_async, safe_no_await, ws_packet_return } from './utils';
import child_process, { ChildProcess } from 'child_process';
import { draw_maplayer } from './draw_maplayer';
import { maplayer } from './maplayer';
import { composer } from './composer';
import { isConstructorDeclaration } from 'typescript';
import overpass from './overpass';

function tick() {
	let v_t = process.hrtime();
	return +(v_t[0] + '.' + v_t[1]);
}

async function tqtq() {
	let v_client = new pg.Client();

	let v_pool = new pg.Pool({
		user: 'gkelly',
		host: 'localhost',
		database: 'taganizer',
		password: '*gkelly*',
		port: 5432
	});

	let v_sql = `
	select row_to_json(fc)
	from (
		select 
		'FeatureCollection' as "type",
		array_to_json(array_agg(f)) as "features"
		from (
			select 
				'Feature' as type, 
				ST_AsGeoJSON( ST_Transform( geo, 3857 ) )::json as geometry,
				(
					select row_to_json(t) from ( select id, note ) t
				) as properties
			from gk
		)	as f
	) as fc;`;

	//await v_client.connect();
	let v_t0 = tick();
	let v_result = await v_pool.query(v_sql);
	let v_t1 = tick();
	//await v_client.end();

	//console.log( v_result );
	console.log('=================================');
	console.log(`count: ${v_result.rows.length}`);

	let v_fc = v_result.rows[0].row_to_json;

	console.log(`features: ${v_fc.features.length} `);

	//console.log( v_fc );

	//v_result.rows.forEach( p_row => {
	//console.log( p_row );	
	//});
	console.log('=================================');

	console.log(`time ${v_t1 - v_t0}`);
}

function open_async(p_path, p_mode): Promise<number> {
	return new Promise((p_resolve, p_reject) => {
		fs.open(p_path, p_mode, (p_err, p_fd) => {
			if (p_err) {
				p_reject(p_err);
			} else {
				p_resolve(p_fd);
			}
		});
	});
}

type read_async_type = {
	buf: Buffer,
	nbytes: number
};

function read_async(p_fd: number, p_buf: Buffer, p_offset: number, p_len: number, p_pos: number): Promise<read_async_type> {
	return new Promise((p_resolve, p_reject) => {
		fs.read(p_fd, p_buf, p_offset, p_len, p_pos, (p_err, p_nbytes, p_buf) => {
			if (p_err) {
				p_reject(p_err);
			} else {
				p_resolve({ buf: p_buf, nbytes: p_nbytes });
			}
		});
	});
};

async function lines(p_path: string) {

	let v_fd = await open_async(p_path, 'r');

	let v_offset = 0;
	let v_len = 4096;
	let v_pos = 0;
	let v_count = 1;
	let v_partial = null;
	let v_buf = Buffer.alloc(v_len);

	while (1 === 1) {

		let v_data = await read_async(v_fd, v_buf, v_offset, v_len, v_pos);

		if (v_data.nbytes == 0) {
			break;
		}

		let v_start = 0;

		for (; ;) {

			let v_index = v_data.buf.indexOf('\x0a', v_start, 'utf8');

			if (-1 == v_index) {
				v_partial = v_data.buf.toString('utf8', v_start);
				break;
			}

			let v_line = v_data.buf.toString('utf8', v_start, v_index - 1);

			if (v_partial != null) {
				v_line = v_partial + v_line;
				v_partial = null;
			}

			console.log(v_line);

			v_start = v_index + 1;
		}

		v_pos += v_data.nbytes;
		v_count++;
	}

	fs.close(v_fd, () => { });


}

class family_db extends db_base {
	constructor() {
		super('family');
	}
}

function xcite(p_template: string) {

	const is_iterable = x => (typeof x?.[Symbol.iterator] === 'function') === true;

	return function (p_data: any) {
		return p_template.replace(/{{\s*([^{}\s]+)\s+(<?[^{}\s]+)\s*}}/g, (_, ...p_args: string[]) => {
			const v_value1 = p_data[p_args[0].trim()];

			let v_list_flag = false;
			if (p_args[1][0] === '<') {
				v_list_flag = true;
				p_args[1] = p_args[1].substr(1);
			}

			const v_value2 = p_data[p_args[1].trim()];

			if (typeof v_value1 === 'function') {
				if (typeof v_value2 !== 'string' && is_iterable(v_value2)) {

					if (v_list_flag) {
						return v_value1(v_value2);
					} else {
						let v_s = '';
						for (const v_item of v_value2) {
							v_s += v_value1(v_item);
						}
						return v_s;
					}
				} else {
					return v_value1(v_value2);
				}

			} else {
				return '#error#';
			}


		}).replace(/{{([^{}]+)}}/g, (_, ...p_args: string[]) => {

			const v_key = p_args[0].trim();

			if (v_key === '-') {
				return p_data;
			}

			const v_value = p_data[v_key];
			return typeof v_value === 'function' ? v_value() : v_value ?? '';
		});
	}
}

function xcite2_test() {

	let v_template = xcite(' hello {{name}} and {{name}} <ul> {{ t1 list }} </ul> {{ fn }}\n{{ t2 list2 }} {{ fn2 <list2 }} {{ fn3 name }}');

	let v_list = [];

	for (let x = 0; x < 10; ++x) {
		v_list.push('item ' + x);
	}

	console.log(v_template({
		name: 'james',
		t1: xcite('<li>{{-}}</li>'),
		t2: xcite('<ZZ>{{first}} - {{last}}</ZZ>\n'),
		list: v_list,
		list2: [
			{ first: 'james', last: 'kelly' },
			{ first: 'samantha', last: 'kelly' },
			{ first: 'g', last: 'kelly' },
		],
		fn: () => 'i like coffee',
		fn2: p_arg => {

			let v_s = '';

			for (const v_item of p_arg) {
				v_s += `#${v_item.first} - ${v_item.last}#\n`;
			}

			return v_s;
		},

		fn3: p_arg => 'goof ' + p_arg
	}));

}

async function child_process_async() {
	/*
	let v_path = '/Users/gkelly/dev/datasets/DistrictOfColumbia.geojson';
	lines(v_path);
	return;

	xcite2_test();
	bcrypt_test_async();
	*/

	const v_family = new family_db();
	//let v_result = await v_family.query_async('select * from names');
	//let v_rows = v_family.get_rows(v_result);

	let v_db = new db_base('family');
	let v_result = await v_db.query_async('select * from names');

	try {
		let v_dts = await db.get_db_timestamp();
		console.log(`database timetamp ${v_dts}`)
	} catch (p_error) {
		console.error('unable to connect to db');
		console.error(p_error);
		return;
	}

	console.log(`xobject.net server - ${new Date().toLocaleString()}`);

	let v_listener = fastify({
		//		https: {
		//key: fs.readFileSync(path.join(__dirname, '../localhost.key')),
		//cert: fs.readFileSync(path.join(__dirname, '../localhost.crt'))
		//},
		//http2: false,
		logger: false
	});

	app.ws_server = new ws_server(v_listener.server);

	//v_app.decorateRequest('auth', {});

	v_listener.register(fastify_compress, { threshold: 0 });
	//v_app.register(fastifyStatic, { root: path.join(__dirname, '../web'), });
	v_listener.register(fastifyCors, {});

	let v_middle_setup = fastify_plugin(function (p_fastify, p_options, p_next) {

		p_fastify.addHook('preHandler', async (p_req, p_res, p_done) => {
			p_done();
		});

		p_next();

	}, {
		fastify: '3.x',
		name: 'xo-auth-middleware'
	});


	let v_user_gkelly_auth = {
		user: 'gkelly',
		user_xid: '82dde3a8-024c-4437-aa48-a8bc95110e36'
	}

	v_listener.addHook('preHandler', (p_req, p_res, p_done) => {
		const v_auth = p_req.headers.authorization;

		if (v_auth) {
			var v_parts = v_auth.split(' ');
			if (v_parts.length == 2 && v_parts[0] == 'Bearer') {
				p_req.auth = v_user_gkelly_auth
			}
		} else {

			p_req.auth = v_user_gkelly_auth;

		}

		if (!p_req.auth) {
			console.log('not authorized');
			p_res.code(401);
			p_done(new Error('oops'));
		} else {
			p_done();
		}

	});

	/*
	v_app.use(async (p_req, p_res, p_done) => {
		let v_auth = p_req.headers.authorization;
	
		if (v_auth) {
	
			var v_parts = v_auth.split(' ');
			if (v_parts.length == 2 && v_parts[0] == 'Bearer') {
	
				p_req.headers.auth = 'zebra';
			}
		}
	
		if (!p_req.headers.auth) {
			console.log('not authorized');
			p_res.statusCode = 401;
			//p_res.code(401);
			p_done(new Error('oops'));
		} else {
			p_done();
		}
	
	});
	*/

	//v_app.register(geocode.routes, { prefix: '/xo' });

	//v_app.register(xAuth, { prefix: 'xauth' });
	//v_app.register(xo_routes, { prefix: 'xo' });

	console.log(`__dirname = ${__dirname}`);

	v_listener.register(fastify_static, {
		root: path.join(__dirname, 'images'),
		prefix: '/images/'
	});

	console.log('\x1b[32m', `node process id ${process.pid}`);
	console.log('\x1b[37m');

	fs.writeFile('.vscode/node.pid', process.pid + '', function (err) {
		if (err) throw err;
	});

	/*
	fastifyWs.on('connection', p_socket => {
		p_socket.on('message', p_msg => {
			p_msg.send(p_msg);
			console.log('websocket - ' + p_msg);
		});
		p_socket.on('close', p_msg => console.log('websocket - close'));
	});
	*/

	let v_l;


	let v_gen = (function* (p_l) {
		//p_l.on('line', p_line => yield p_line);
	});

	v_listener.get('/access_token', async (p_req, p_res) => {
		const v_access_token = await app.get_access_token_async();
		p_res.status(200).type('application/json').send({ access_token: v_access_token });
	});

	//ws_server.http_server.on('request', p_tq => {
	//debugger;
	//});//v_app); // express will use same server

	app.ws_server.add_handler('authorize', authorize_async);
	app.ws_server.add_handler('ws-test', ws_test_async);
	app.ws_server.add_handler('get-user-context', get_user_context_async);
	app.ws_server.add_handler('get-layersets', get_layersets_async);
	app.ws_server.add_handler('get-layer-features', get_layer_features_async);

	layer.add_handlers();
	overpass.add_handlers();

	app.ws_server.add_handler('get-test-list', async p_ws_packet => {
		let v_query = await db.query_async('select xid, xtype,xname,to_json(xgeo) geo from gk1.fl1');
		let v_list = v_query.rows;
		return ws_packet_return(p_ws_packet, true, v_list);
	});

	geocode.add_handlers();
	bookmark.add_handlers();

	await v_listener.listen(8081);

}

function test() {

	const query = new OverpassQuery()
		.setFormat('json')
		.setTimeout(30)
		.addElement({
			type: 'node',
			tags: [{ amenity: 'restaurant' }],
			bbox: [47.48047027491862, 19.039797484874725, 47.51331674014172, 19.07404761761427]
		});

	type dancer = {
		type_of_dance: string,
		dance();
	};

	let dancer = composer<dancer>({

		type_of_dance: '',

		dance() {
			console.log('time to dance - ', this.type_of_dance);
		},

		[composer.init](p_config) {
			this.type_of_dance = p_config.type_of_dance;
		}

	});

	type father = dancer & {
		spouse: string,
		support_family()
	};

	let father = composer({

		spouse: '',

		support_family() {
			console.log('father', 'support family');
		},

		[composer.init](p_config: { spouse: string }) {
			this.spouse = p_config.spouse;
			dancer[composer.init].call(this, { type_of_dance: 'tonga' });
		}

	}, dancer);

	interface christian {
		church: string,
		pray(),
		go_to_church(),
	}

	let christian = composer<christian>({

		church: '',

		pray() {
			console.log('christian', 'pray');
		},

		go_to_church() {
			console.log('christian', 'go to church at ' + this.church);
		},

		[composer.init](p_config: { church: string }) {
			this.church = p_config.church;
		}

	});

	//let v_christian = christian({ church: 'immanuel' });

	type person = christian & father & {
		name: string,
		eat()
	}

	type person_config = {
		name?: string,
		church?: string,
		spouse?: string,
		type_of_dance?: string
	}

	let person = composer<person, person_config>({

		name: '',

		eat() {
			console.log('person', 'time to eat');
		},

		//[composer.init](p_config: person) {
		[composer.init](p_config: person_config) {
			this.name = p_config.name;
			christian[composer.init].call(this, p_config);
			father[composer.init].call(this, p_config);
		}

	}, christian, father);

	let v_person = person({ name: 'gkelly', spouse: 'elizabeth', church: 'berean' });

	console.log('** person', v_person.name);
	console.log('** church', v_person.church);

	debugger;
}

//test();

(async () => {

	const v_child_process_marker = '--xo-child--';
	const v_is_child_process = process.argv[2] === v_child_process_marker;

	if (v_is_child_process) {

		safe_no_await(child_process_async());

	} else {

		let v_child_process: ChildProcess;

		async function on_child_exit_async() {
			console.log('child has exited - restarting in 2 seconds');
			await delay_async(2000);
			create_child();
		}

		function create_child() {
			console.log('creating child process');
			v_child_process = child_process.fork(process.argv[1], [v_child_process_marker]);
			v_child_process.once('exit', on_child_exit_async);
		}

		console.log(`parent process - ${process.pid}`);

		create_child();
	}

})();

async function authorize_async(p_ws_packet: ws_packet_type, p_ws_context: ws_context): Promise<ws_packet_type> {
	try {

		const v_params: {
			access_token: string
		} = p_ws_packet.data;

		if (typeof v_params.access_token !== 'string') {
			throw 'invalid access token';
		}

		const v_user_xid = await app.validate_access_token_async(v_params.access_token);

		if (v_user_xid) {

			let v_query = await db.query_async('select owner_xid from xo.user where xid=$1::uuid', [v_user_xid]);

			if (v_query.rowCount === 1) {
				p_ws_context.user_xid = v_user_xid;
				p_ws_context.owner_xid = v_query.rows[0].owner_xid;
				p_ws_context.authorized = true;
			}

			return { ...p_ws_packet, successful: true, data: 'authorized' };

		} else {
			return { ...p_ws_packet, successful: false, data: 'not authorized' };
		}


	} catch (p_error) {

		return { ...p_ws_packet, successful: false, data: p_error };

	}
}

async function get_layersets_async(p_ws_packet: ws_packet_type): Promise<ws_packet_type> {

	try {

		const v_result = await db.query_async('select * from xo.layerset order by xname');
		return { ...p_ws_packet, successful: true, data: v_result.rows };

	} catch (p_error) {

		return { ...p_ws_packet, successful: false, data: p_error };

	}
}



type get_layer_features_async_type = {
	xid: number,
	xid_list: number[]
};

async function get_layer_features_async(p_ws_packet: ws_packet_type): Promise<ws_packet_type> {

	try {
		const v_data = p_ws_packet.data as get_layer_features_async_type;

		const v_layer_result = await db.query_async('select * from xo.layer where xid = $1', [v_data.xid]);
		const v_layer = db.get_first_row<layer_row>(v_layer_result);

		let v_md = await db.mapdata_2_async(v_layer.schema_name + '.' + v_layer.table_name, v_data.xid_list);

		//const v_result = await db.query_async('select * from xo.layer where layerset_id = $1 order by xname', [v_xid]);
		return { ...p_ws_packet, successful: true, data: v_md };

	} catch (p_error) {

		return { ...p_ws_packet, successful: false, data: p_error };

	}
}

async function get_user_context_async(p_ws_packet: ws_packet_type): Promise<ws_packet_type> {

	try {

		return { ...p_ws_packet, successful: true, data: 'you got me' };

	} catch (p_error) {

		return { ...p_ws_packet, successful: false, data: p_error };

	}
}

async function ws_test_async(p_ws_packet: ws_packet_type): Promise<ws_packet_type> {

	return { ...p_ws_packet, successful: true, data: 'you got me' };
}
