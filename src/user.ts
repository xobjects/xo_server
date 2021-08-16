import { success, fail, valid_postgres_identifier } from './utils';
import db from './db';
import { ws_result_type, xobject_type } from '../@types/xobjects';
import { layerset } from './layerset';
import { ws_packet_type } from './types';

type user_context_type = {
	user_id: string,
	default_layerset_id: number,
	scratch_layer_id: number,
	layersets: any[]
};

export abstract class user {

	static routes(p_fastify, p_options, p_done) {

		console.log('user routes');

		p_fastify.get('/user/get_context', user.get_context_async);

		p_done();
	}

	static async get_user_context_async(p_ws_packet: ws_packet_type, p_context: any): Promise<ws_packet_type> {

		try {

			let v_auth: any = {};
			//[p_req.auth.user_id]);

			// load default layerset for user

			let v_db_layerset = await db.query_first_async('select * from xo_admin.layerset where user_id = $1::uuid and is_default',
				[v_auth.user_id]);

			if (!v_db_layerset) {
				throw { message: 'no default layerset found' }
			}

			// make sure there is a scratch layer in the default layer set

			let v_db_layer = await db.query_first_async("select *, xstyle from xo_admin.layer where layerset_id = $1::int and xtype = 'scr'", [v_db_layerset.xid]);

			if (!v_db_layer) {
				// create the scratch layer if necessary
				let v_client = await db.client_async();

				let v_exists = await db.table_exists_async(v_db_layerset.schema, 'scratch');

				if (!v_exists) {
					await db.transaction_begin_async(v_client);
					await db.create_layer_async(v_db_layerset.schema, 'scratch', v_client);
					console.log(`created scratch table ${v_db_layerset.schema}.scratch`);
				}

				// add entry in layer table
				let v_result = await db.query_async('insert into xo_admin.layer (layerset_id,xtype,xname,table_name, dts_created, dts_updated) values ($1::int, $2, $3, $3, current_timestamp, current_timestamp) returning xid',
					[v_db_layerset.xid, 'scr', 'scratch'], v_client);

				let v_db_row = db.get_first_row(v_result);

				console.log(`added layer (${v_db_row.xid}) row for scratch table`);

				await db.transaction_commit_async(v_client);

				v_db_layer = await db.query_first_async("select * from xo_admin.layer where layerset_id = $1::int and xtype = 'scr'", [v_db_layerset.xid]);
			}

			let v_db_layersets = await layerset.get_layersets_raw_async(v_auth);
			let v_layersets: xobject_type[] = v_db_layersets.map(p_db_layerset => ({
				xid: p_db_layerset.xid,
				xtype: p_db_layerset.xtype,
				xname: p_db_layerset.xname,
				is_default: p_db_layerset.is_default
			}));

			let v_response: user_context_type = {
				user_id: v_auth.user_id,
				default_layerset_id: v_db_layerset.xid,
				scratch_layer_id: v_db_layer.xid,
				layersets: v_layersets
			};

			return { ...p_ws_packet, successful: true };


		} catch (p_error) {

			return { ...p_ws_packet, successful: false, data: p_error.message };

		}

	}

	static async get_context_async(p_req, p_res): Promise<ws_result_type> {

		try {
			// load default layerset for user

			let v_db_layerset = await db.query_first_async('select * from xo_admin.layerset where user_id = $1::uuid and is_default',
				[p_req.auth.user_id]);

			if (!v_db_layerset) {
				throw { message: 'no default layerset found' }
			}

			// make sure there is a scratch layer in the default layer set

			let v_db_layer = await db.query_first_async("select *, xstyle from xo_admin.layer where layerset_id = $1::int and xtype = 'scr'", [v_db_layerset.xid]);

			if (!v_db_layer) {
				// create the scratch layer if necessary
				let v_client = await db.client_async();

				let v_exists = await db.table_exists_async(v_db_layerset.schema, 'scratch');

				if (!v_exists) {
					await db.transaction_begin_async(v_client);
					await db.create_layer_async(v_db_layerset.schema, 'scratch', v_client);
					console.log(`created scratch table ${v_db_layerset.schema}.scratch`);
				}

				// add entry in layer table
				let v_result = await db.query_async('insert into xo_admin.layer (layerset_id,xtype,xname,table_name, dts_created, dts_updated) values ($1::int, $2, $3, $3, current_timestamp, current_timestamp) returning xid',
					[v_db_layerset.xid, 'scr', 'scratch'], v_client);

				let v_db_row = db.get_first_row(v_result);

				console.log(`added layer (${v_db_row.xid}) row for scratch table`);

				await db.transaction_commit_async(v_client);

				v_db_layer = await db.query_first_async("select * from xo_admin.layer where layerset_id = $1::int and xtype = 'scr'", [v_db_layerset.xid]);
			}

			let v_db_layersets = await layerset.get_layersets_raw_async(p_req.auth);
			let v_layersets: xobject_type[] = v_db_layersets.map(p_db_layerset => ({
				xid: p_db_layerset.xid,
				xtype: p_db_layerset.xtype,
				xname: p_db_layerset.xname,
				is_default: p_db_layerset.is_default
			}));

			let v_response: user_context_type = {
				user_id: p_req.auth.user_id,
				default_layerset_id: v_db_layerset.xid,
				scratch_layer_id: v_db_layer.xid,
				layersets: v_layersets
			};

			return success(v_response);

		} catch (p_error) {
			return fail(p_error.message);
		}

	}

	static async add_async(p_req, p_res) {

		try {

			let v_layerset = await db.simple_row_async('xo_admin.layerset', 'xid', p_req.body.layerset_id, 'int');

			if (!v_layerset) {
				return fail(`invalid layerset: ${p_req.body.layerset_id}`);
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

			let v_sql = `insert into xo_admin.layer( xtype, xname, table_name, layerset_id, dts_created, dts_updated ) values ( $1::text, $2::text, $2::text, $3::int, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP  ) `;
			await db.query_async(v_sql, ['layer', p_req.body.layer_name, v_layerset.xid]);

			return success();

		} catch (p_error) {
			return fail(p_error.message);
		}

	}

	static async list_async(p_req, p_res) {

		try {

			let v_layerset = await db.get_default_user_layerset(p_req.auth.user_id);

			if (v_layerset) {
				let v_layers = await db.get_layerset_layers(v_layerset.xid);

				return success({
					layerset: v_layerset,
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

			let v_layerset_id = p_req.params.layerset_id;

			let v_result = await db.query_async(`select xid,xtype,xname,ST_AsGeoJSON(xgeo)::json as xgeo, table_name, layerset_id, dts_created, dts_updated from xo_admin.layer where layerset_id = $1`,
				[v_layerset_id]);

			let v_rows = db.get_rows(v_result);

			return success(v_rows);
		} catch (p_error) {
			return fail(p_error.message);
		}
	}
}