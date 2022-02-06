import { success, fail, valid_postgres_identifier } from './utils';
import db from './db';
import { v4 as uuid } from 'uuid';
import { auth_type } from '../@types/xobjects';

export abstract class layerset {

	static async new_layerset_async(p_req, p_res) {

		try {

			let v_db_layerset = await db.simple_row_async('xo_admin.layerset', 'xname', p_req.params.layerset_name, 'text');

			if (v_db_layerset) {
				throw new Error(`layerset ${v_db_layerset.xname} already exists`);
			}

			if (!valid_postgres_identifier(p_req.params.layerset_name)) {
				throw new Error(`invalid layerset name ${p_req.params.layerset_name}`);
			}

			let v_client = await db.client_async();
			await db.transaction_begin_async(v_client);

			await db.query_async(`create schema ${p_req.params.layerset_name}`, null, v_client);

			let v_xuuid = await db.gen_uuid();

			let v_result = await db.query_async(`insert into xo_admin.layerset 
				(xtype, xname, schema, xuuid, user_xid, dts_created, dts_updated) 
				values ($1::text, $2::text, $2::text, $3::uuid, $4::uuid,
					current_timestamp, current_timestamp) returning xid`,
				[p_req.params.layerset_type, p_req.params.layerset_name, v_xuuid, p_req.auth.user_xid], v_client);

			await db.transaction_commit_async(v_client);

			return success();

		} catch (p_error) {
			return fail(p_error);
		}

	}

	static async get_layersets_raw_async(p_auth: auth_type) {

		let v_result = await db.query_async(`select xid,xtype,xname,ST_AsGeoJSON(xgeo)::json as xgeo, schema, is_default, company_xid, user_xid, dts_created, dts_updated from xo_admin.layerset where user_xid = $1`,
			[p_auth.user_xid]);

		return db.get_rows(v_result);
	}

	static async get_layersets_async(p_req, p_res) {
		try {

			let v_rows = await layerset.get_layersets_raw_async(p_req.auth);
			return success(v_rows);

		} catch (p_error) {
			return fail(p_error.message);
		}
	}

	static async get_layerset_async(p_req, p_res) {
		try {

			let v_layerset_xid = p_req.params.layerset_xid;

			let v_result;

			if (v_layerset_xid === 'default') {

			} else {
				v_result = await db.query_async(`select xid,xtype,xname,ST_AsGeoJSON(xgeo)::json as xgeo, schema, company_xid, user_xid, dts_created, dts_updated from xo_admin.layerset where user_xid = $1`,
					[p_req.auth.user_xid]);
			}

			let v_rows = db.get_rows(v_result);

			return success(v_rows);
		} catch (p_error) {
			return fail(p_error.message);
		}
	}
}
