import shortid from 'shortid';

import fastify from 'fastify';
import fastify_compress from 'fastify-compress';
import fastify_static from 'fastify-static';
import fastify_cors from 'fastify-cors';
import fastify_ws from 'fastify-ws';
import fastify_plugin from 'fastify-plugin';

import fs from 'fs';
import linebyline from 'linebyline';

import pg from 'pg';
import path, { basename } from 'path';

import { xo } from './xo';
import { layer } from './layer';
import { layerset } from './layerset';
import { bookmark } from './bookmark';
import { user } from './user';

import fastifyCors from 'fastify-cors';
import db from './db';
import { geocode } from './geocode';
import { db_base } from './db_base';
import { Server } from 'http';

import { ws_server } from './ws_server';
import { bcrypt_test_async } from './security';
import { layer_row, ws_packet_type } from './types';

import * as model from './oauth2_model';

//import cacheControl from './cacheControl';

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

(async function () {

	/*
	let v_path = '/Users/gkelly/dev/datasets/DistrictOfColumbia.geojson';
	lines(v_path);
	return;
	*/

	bcrypt_test_async();

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

	let v_app = fastify({
		//		https: {
		//key: fs.readFileSync(path.join(__dirname, '../localhost.key')),
		//cert: fs.readFileSync(path.join(__dirname, '../localhost.crt'))
		//},
		//http2: false,
		logger: false
	});

	const v_ws_server = new ws_server(v_app.server);

	//v_app.decorateRequest('auth', {});

	v_app.register(fastify_compress, { threshold: 0 });
	//v_app.register(fastifyStatic, { root: path.join(__dirname, '../web'), });
	v_app.register(fastifyCors, {});

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
		user_id: '82dde3a8-024c-4437-aa48-a8bc95110e36'
	}

	v_app.addHook('preHandler', (p_req, p_res, p_done) => {
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

	v_app.register(xo.routes, { prefix: '/xo' });
	v_app.register(layer.routes, { prefix: '/xo' });
	v_app.register(layerset.routes, { prefix: '/xo' });
	v_app.register(bookmark.routes, { prefix: '/xo' });
	v_app.register(user.routes, { prefix: '/xo' });
	v_app.register(geocode.routes, { prefix: '/xo' });

	//v_app.register(xAuth, { prefix: 'xauth' });
	//v_app.register(xo_routes, { prefix: 'xo' });

	console.log(`__dirname = ${__dirname}`);

	v_app.register(fastify_static, {
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

	v_app.get('/geojson', async (p_req, p_res) => {

		let v_path = '/Users/gkelly/dev/datasets/NewYork.geojson';


		//console.log(v_l);
	});

	//ws_server.http_server.on('request', p_tq => {
	//debugger;
	//});//v_app); // express will use same server

	v_ws_server.add_handler('authorize', authorize_async);
	v_ws_server.add_handler('ws-test', ws_test_async);
	v_ws_server.add_handler('get-user-context', get_user_context_async);
	v_ws_server.add_handler('get-layersets', get_layersets_async);
	v_ws_server.add_handler('get-layers', get_layers_async);
	v_ws_server.add_handler('get-layer-features', get_layer_features_async);

	await v_app.listen(8081);

}());

async function authorize_async(p_ws_packet: ws_packet_type, p_context: any): Promise<ws_packet_type> {
	try {

		p_context.authorized = true;
		return { ...p_ws_packet, successful: true, data: 'you are now authorized' };

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

async function get_layers_async(p_ws_packet: ws_packet_type): Promise<ws_packet_type> {

	try {
		const v_xid = p_ws_packet.data.xid;

		const v_result = await db.query_async('select * from xo.layer where layerset_id = $1 order by xname', [v_xid]);
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
