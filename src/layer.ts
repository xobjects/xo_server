import { success, fail, valid_postgres_identifier } from './utils';
import db from './db';

export abstract class layer {

	static routes(p_fastify, p_options, p_done) {

		console.log('layer routes');

		p_fastify.get('/layer/list/:layerset_id', layer.list_async);
		p_fastify.post('/layer/add', layer.add_async);
		p_fastify.post('/layer/save_xobject', layer.save_xobject_async);
		p_fastify.post('/layer/get_xobjects', layer.get_xobjects_async);
		p_fastify.get('/layer/new_layer/:layerset_id/:layer_name', layer.new_layer_async);
		//p_fastify.get('/layer/:layerset_id', layer.get_async);

		p_done();
	}

	static async new_layer_async(p_req, p_res) {

		try {

			let v_db_layerset = await db.simple_row_async('xo_admin.layerset', 'xid', p_req.params.layerset_id, 'int');

			if (!v_db_layerset) {
				throw new Error(`invalid layerset_id ${p_req.params.layerset_id}`);
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

			let v_result = await db.query_async('insert into xo_admin.layer (layerset_id,xtype,xname,table_name, dts_created, dts_updated) values ($1::int, $2, $3, $3, current_timestamp, current_timestamp) returning xid',
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

			let v_db_layer = await db.simple_row_async('xo_admin.layer', 'xid', p_req.body.layer_id, 'int');

			if (!v_db_layer) {
				throw new Error(`invalid layer_id ${p_req.body.layer_id}`);
			}

			let v_db_layerset = await db.simple_row_async('xo_admin.layerset', 'xid', v_db_layer.layerset_id, 'int');

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
			let v_layer_id = p_req.body.layer_id;

			let v_db_layer = await db.simple_row_async('xo_admin.layer', 'xid', v_layer_id, 'int');

			if (!v_db_layer) {
				return fail(`invalid layer ${v_layer_id}`);
			}

			let v_db_layerset = await db.simple_row_async('xo_admin.layerset', 'xid', v_db_layer.layerset_id, 'int');

			if (!v_db_layerset) {
				return fail(`invalid layerset ${v_db_layer.layerset_id}`);
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

			//let v_layerset = await db.get_default_user_layerset(p_req.auth.user_id);
			let v_db_layerset = await db.simple_row_async('xo_admin.layerset', 'xid', p_req.params.layerset_id, 'int');

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