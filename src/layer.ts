import shortid_uuid from 'short-uuid';
import { v4 as uuid } from 'uuid';
import { ws_packet_return } from './utils';
import db from './db';
import app from './app';
import { ws_context, ws_packet_type } from './types';
import { xobject } from '../@types/xobjects';
import { QueryResult } from 'pg';

export default {
	add_handlers
}

function add_handlers() {
	app.ws_server.add_handler('layer-list', layer_list_async)
	app.ws_server.add_handler('layer-data', layer_data_async)
	app.ws_server.add_handler('layer-add', layer_add_async)
	app.ws_server.add_handler('layer-update', layer_update_async)
	//
	app.ws_server.add_handler('layerset-list', layerset_list_async)
	app.ws_server.add_handler('layerset-add', layerset_add_async)
}

async function layerset_list_async(p_ws_packet: ws_packet_type, p_ws_context: ws_context): Promise<ws_packet_type> {

	try {

		const v_result = await db.query_async(`
			select ls.xid, ls.xname from xo.layerset ls 
			inner join xo.owner o on o.xid = ls.owner_xid
			inner join xo.user u on u.owner_xid = ls.owner_xid and u.xid = $1::uuid`, [p_ws_context.user_xid]);

		return { ...p_ws_packet, successful: true, data: v_result.rows };


	} catch (p_error) {

		return ws_packet_return(p_ws_packet, false, p_error);

	}
}
async function layerset_add_async(p_ws_packet: ws_packet_type, p_ws_context: ws_context): Promise<ws_packet_type> {

	try {

		const v_params: {
			xname: string
		} = p_ws_packet.data;

		if (typeof v_params?.xname != 'string') {
			throw 'invalid layerset name';
		}

		const v_user = await db.get_user_async(p_ws_context.user_xid);
		const v_layersets = await db.get_layersets_async(v_user.owner_xid);

		if (v_layersets.find(x => x.xname === v_params.xname)) {
			throw 'layerset by this name already exists';
		}

		let v_schema_name = await new_schema_async();

		await db.query_async('insert into xo.layerset (xname,schema_name,owner_xid,xuuid) values( $1::text,$2::text,$3::uuid,$4::uuid) returning xid',
			[v_params.xname, v_schema_name, v_user.owner_xid, uuid()]);

		return { ...p_ws_packet, successful: true, data: true };

	} catch (p_error) {

		return ws_packet_return(p_ws_packet, false, p_error);

	}
}

async function new_schema_async() {

	for (; ;) {
		try {
			const v_schema_name = 'ls_' + Date.now();

			const v_schema_exists = await db.schema_exists_async(v_schema_name);

			if (v_schema_exists) {
				continue;
			}

			const v_query = await db.query_async(`create schema ${v_schema_name} `);

			return v_schema_name;

		} catch { }
	}
}

async function new_layer_table_async(p_schema_name: string) {

	for (; ;) {
		try {
			const v_table_name = 'l_' + Date.now();

			const v_table_exists = await db.table_exists_async(p_schema_name, v_table_name);

			if (v_table_exists) {
				continue;
			}

			const v_query = await db.create_layer_table_async(p_schema_name, v_table_name);

			return v_table_name;

		} catch (p_error) {
			debugger;
		}
	}
}

interface layer {
	xid: number,
	xname: string
}
interface layerset {
	xid: number,
	xname: string
	layers: layer[]
}

async function layer_list_async(p_ws_packet: ws_packet_type, p_ws_context: ws_context): Promise<ws_packet_type> {

	try {

		const v_params: {
			xid: number
		} = p_ws_packet.data;

		//if (typeof v_params?.xid != 'number') {
		//throw 'invalid xid';
		//}

		const v_user_xid = '82DDE3A8-024C-4437-AA48-A8BC95110E36';

		let v_query = await db.query_async('select * from xo.layerset where owner_xid=$1::uuid', [p_ws_context.owner_xid]);
		let v_layerset_list = v_query.rows.map(x => ({
			xid: x.xid,
			xname: x.xname,
			layers: []
		}));

		v_query = await db.query_async(`select l.xid, l.xname, ls.xid layerset_xid from xo.layer l 
			inner join xo.layerset ls on ls.xid = l.layerset_xid and ls.owner_xid=$1::uuid`, [p_ws_context.owner_xid]);

		v_query.rows.forEach(p_layer => {
			const v_layerset = v_layerset_list.find(x => x.xid === p_layer.layerset_xid);
			if (v_layerset) {
				v_layerset.layers.push({
					xid: p_layer.xid,
					xname: p_layer.xname
				});
			}
		});

		return { ...p_ws_packet, successful: true, data: v_layerset_list };

	} catch (p_error) {

		return ws_packet_return(p_ws_packet, false, p_error);

	}
}

async function layer_data_async(p_ws_packet: ws_packet_type): Promise<ws_packet_type> {

	try {

		const v_params: {
			layer_xid: number
		} = p_ws_packet.data;

		if (typeof v_params?.layer_xid != 'number') {
			throw 'invalid layer_xid';
		}

		let v_result = await db.query_async(`
			select l.table_name, ls.schema_name 
			from xo.layer l inner join layerset ls on ls.xid = l.layerset_xid
			where l.xid = $1::int`,
			[v_params.layer_xid])

		let v_layer_db = v_result.rows[0];
		const v_schema_table = `${v_layer_db.schema_name}.${v_layer_db.table_name}`;

		v_result = await db.query_async(`
			select xid, xtype, xname, to_json(xgeo) xgeo from ${v_schema_table} 
		` );

		return { ...p_ws_packet, successful: true, data: v_result.rows };


	} catch (p_error) {

		return ws_packet_return(p_ws_packet, false, p_error);

	}
}

async function layer_update_async(p_ws_packet: ws_packet_type): Promise<ws_packet_type> {

	try {

		const v_params: {
			layer_xid: number,
			xobject: xobject
		} = p_ws_packet.data;

		if (typeof v_params?.layer_xid != 'number') {
			throw 'invalid layer_xid';
		}

		if (!v_params.xobject) {
			throw 'invalid xobject';
		}

		const v_user_xid = '82DDE3A8-024C-4437-AA48-A8BC95110E36';

		let v_result = await db.query_async(`
			select l.table_name, ls.schema_name 
			from xo.layer l inner join layerset ls on ls.xid = l.layerset_xid
			where l.xid = $1::int`,
			[v_params.layer_xid])

		let v_layer_db = v_result.rows[0];
		const v_schema_table = `${v_layer_db.schema_name}.${v_layer_db.table_name}`;

		if (typeof v_params.xobject.xid !== 'undefined') {
			v_result = await db.query_async(`update ${v_schema_table} set xgeo = ST_GeomFromGeoJSON($2::json)::geometry where xid=$1::int`, [v_params.xobject.xid, v_params.xobject.xgeo]);
			return { ...p_ws_packet, successful: true, data: { rows_updated: v_result.rowCount } };
		} else {
			v_result = await db.query_async(`insert into ${v_schema_table} (xgeo,xname) values ( ST_GeomFromGeoJSON($1::json)::geometry, $2::text) returning xid`, [v_params.xobject.xgeo, 'new object']);
			const v_xid = v_result.rows?.[0].xid;
			return { ...p_ws_packet, successful: true, data: { id: v_result.rowCount } };
		}


	} catch (p_error) {

		return ws_packet_return(p_ws_packet, false, p_error);

	}
}

async function layer_add_async(p_ws_packet: ws_packet_type, p_ws_context: ws_context): Promise<ws_packet_type> {

	try {

		const v_params: {
			layerset_xid: number,
			xname: string,
			xtype: string
		} = p_ws_packet.data;

		if (typeof v_params?.layerset_xid != 'number') {
			throw 'invalid layerset xid';
		}

		if (typeof v_params?.xname != 'string') {
			throw 'invalid layer xname';
		}

		if (typeof v_params?.xtype != 'string') {
			throw 'invalid layer xtype';
		}

		const v_user = await db.get_user_async(p_ws_context.user_xid);
		const v_layerset = await db.get_layerset_async(v_user.owner_xid, v_params.layerset_xid);

		let v_table_name = await new_layer_table_async(v_layerset.schema_name);

		await db.query_async('insert into xo.layer (xname,layerset_xid, table_name) values( $1::text,$2::int,$3::text) returning xid',
			[v_params.xname, v_layerset.xid, v_table_name]);

		return { ...p_ws_packet, successful: true };

	} catch (p_error) {

		return ws_packet_return(p_ws_packet, false, p_error);

	}
}
/*
export abstract class layer {

	static routes(p_fastify, p_options, p_done) {

		console.log('layer routes');

		p_fastify.get('/layer/list/:layerset_xid', layer.list_async);
		p_fastify.post('/layer/add', layer.add_async);
		p_fastify.post('/layer/save_xobject', layer.save_xobject_async);
		p_fastify.post('/layer/get_xobjects', layer.get_xobjects_async);
		p_fastify.get('/layer/new_layer/:layerset_xid/:layer_name', layer.new_layer_async);
		//p_fastify.get('/layer/:layerset_xid', layer.get_async);

		p_done();
	}

	static async new_layer_async(p_req, p_res) {

		try {

			let v_db_layerset = await db.simple_row_async('xo_admin.layerset', 'xid', p_req.params.layerset_xid, 'int');

			if (!v_db_layerset) {
				throw new Error(`invalid layerset_xid ${p_req.params.layerset_xid}`);
			}

			let v_db_layer = await db.simple_row_async('xo_admin.layer', 'xname', p_req.params.layer_name, 'text');

			if (v_db_layer) {
				throw new Error(`layer ${v_db_layerset.xname}.${p_req.params.layer_name} already exists`);
			}

			if (!valid_postgres_identifier(p_req.params.layer_name)) {
				throw new Error(`invalid layer name ${p_req.params.layer_name}`);
			}

			let v_client = await db.client_async();
			await db.transaction_begin_async(v_client);

			await db.create_layer_async(v_db_layerset.schema, p_req.params.layer_name, v_client);

			let v_result = await db.query_async('insert into xo_admin.layer (layerset_xid,xtype,xname,table_name, dts_created, dts_updated) values ($1::int, $2, $3, $3, current_timestamp, current_timestamp) returning xid',
				[v_db_layerset.xid, '*', p_req.params.layer_name], v_client);

			await db.transaction_commit_async(v_client);

			return success();

		} catch (p_error) {
			return fail(p_error);
		}

	}

	static async get_xobjects_async(p_req, p_res) {
		try {
			//logger.i('update map', 'xobjects', 'map');

			let v_bounds_xgeo = p_req.body.bounds_xgeo;
			let v_xid_list = p_req.body.xid_list || [];
			v_xid_list.push(-1);

			let v_db_layer = await db.simple_row_async('xo_admin.layer', 'xid', p_req.body.layer_xid, 'int');

			if (!v_db_layer) {
				throw new Error(`invalid layer_xid ${p_req.body.layer_xid}`);
			}

			let v_db_layerset = await db.simple_row_async('xo_admin.layerset', 'xid', v_db_layer.layerset_xid, 'int');

			let v_fqn = v_db_layerset.schema + '.' + v_db_layer.table_name;
			let v_fc = await db.mapdata_async(v_fqn, v_xid_list, v_bounds_xgeo);

			return success(v_fc);

		} catch (p_error) {
			return fail(p_error);
		}

	}

	static async save_xobject_async(p_req, p_res) {

		try {
			console.log('save_xobject_async');

			let v_xobject = p_req.body.xobject;
			let v_layer_xid = p_req.body.layer_xid;

			let v_db_layer = await db.simple_row_async('xo_admin.layer', 'xid', v_layer_xid, 'int');

			if (!v_db_layer) {
				return fail(`invalid layer ${v_layer_xid}`);
			}

			let v_db_layerset = await db.simple_row_async('xo_admin.layerset', 'xid', v_db_layer.layerset_xid, 'int');

			if (!v_db_layerset) {
				return fail(`invalid layerset ${v_db_layer.layerset_xid}`);
			}

			let v_fl = `${v_db_layerset.schema}.${v_db_layer.table_name}`;

			let v_row;

			if (v_xobject.xid) {

				let v_result = await db.query_async(`
					update ${v_fl} set
					xgeo = ST_GeomFromGeoJSON($1::json)::geometry,
					xname = $2::text,
					dts_updated = current_timestamp
					where xid = $3::int`,
					[v_xobject.xgeo, v_xobject.xname, v_xobject.xid]);

				console.log(`save_xobject_async: ${v_result.command} - ${v_result.rowCount}`)

				v_row = { xid: v_xobject.xid };

			} else {

				v_row = await db.query_first_async(`
					insert into ${v_fl} ( xtype, xname, xgeo, dts_created, dts_updated ) values( $1, $2, ST_GeomFromGeoJSON($3::json)::geometry, current_timestamp, current_timestamp ) returning xid`,
					[v_xobject.xtype, v_xobject.xname, v_xobject.xgeo]);

			}

			return success(v_row);

		} catch (p_error) {
			console.log(p_error);
		}

	}

	static async add_async(p_req, p_res) {

		try {

			let v_layerset = await db.simple_row_async('xo_admin.layerset', 'xid', p_req.body.layerset_xid, 'int');

			if (!v_layerset) {
				return fail(`invalid layerset: ${p_req.body.layerset_xid}`);
			}

			if (!valid_postgres_identifier(p_req.body.layer_name)) {
				return fail(`invalid layer_name: ${p_req.body.layer_name}`);
			}

			if (await db.table_exists_async(v_layerset.schema, p_req.body.layer_name)) {
				return fail(`layer already exists: ${v_layerset.schema}.${p_req.body.layer_name}`);
			}

			await db.create_layer_async(v_layerset.schema, p_req.body.layer_name);

			if (!(await db.table_exists_async(v_layerset.schema, p_req.body.layer_name))) {
				return fail(`problem creating layer table: ${v_layerset.schema}.${p_req.body.layer_name}`);
			}

			let v_sql = `insert into xo_admin.layer( xtype, xname, table_name, layerset_xid, dts_created, dts_updated ) values ( $1::text, $2::text, $2::text, $3::int, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP  ) `;
			await db.query_async(v_sql, ['layer', p_req.body.layer_name, v_layerset.xid]);

			return success();

		} catch (p_error) {
			return fail(p_error.message);
		}

	}

	static async list_async(p_req, p_res) {

		try {

			//let v_layerset = await db.get_default_user_layerset(p_req.auth.user_xid);
			let v_db_layerset = await db.simple_row_async('xo_admin.layerset', 'xid', p_req.params.layerset_xid, 'int');

			if (v_db_layerset) {
				let v_layers = await db.get_layerset_layers(v_db_layerset.xid);

				return success({
					layerset: v_db_layerset,
					layers: v_layers
				});

			} else {
				return fail('no default layer set');
			}

		} catch (p_error) {
			return fail(p_error.message);
		}
	}

	static async get_async(p_req, p_res) {
		try {

			let v_layerset_xid = p_req.params.layerset_xid;

			let v_result = await db.query_async(`select xid,xtype,xname,ST_AsGeoJSON(xgeo)::json as xgeo, table_name, layerset_xid, dts_created, dts_updated from xo_admin.layer where layerset_xid = $1`,
				[v_layerset_xid]);

			let v_rows = db.get_rows(v_result);

			return success(v_rows);
		} catch (p_error) {
			return fail(p_error.message);
		}
	}
}
*/