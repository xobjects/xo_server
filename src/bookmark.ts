import { success, fail } from './utils';
import db from './db';
import { app_data } from './app_data';
import { ws_packet_type } from './types';

export abstract class bookmark {

	/*
	static routes(p_fastify, p_options, p_done) {

		console.log('bookmark routes');

		p_fastify.get('/bookmark/list', bookmark.get_bookmarks_async);
		p_fastify.post('/bookmark/add', bookmark.add_bookmark_async);
		p_fastify.get('/bookmark/get/:xid', bookmark.get_bookmark_async);
		p_fastify.get('/bookmark/delete/:xid', bookmark.delete_bookmark_async);

		p_done();
	}
	*/

	static add_handlers() {


		app_data.ws_server.add_handler('bookmark-set', bookmark.ws_bookmark_set_async);

	}

	static async get_bookmarks_async(p_req, p_res) {
		try {

			const v_result = await db.query_async(`select xid,xtype,xname,ST_AsGeoJSON(xgeo)::json as xgeo, zoom from xo.bookmark where user_id = $1`,
				[p_req.auth.user_id]);

			let v_rows = v_result.rows;

			return success(v_rows);
		} catch (p_error) {
			return fail(p_error.message);
		}
	}

	static async ws_bookmark_set_async(p_ws_packet: ws_packet_type): Promise<ws_packet_type> {

		try {

			debugger;

		} catch (p_error) {

			return { ...p_ws_packet, successful: false, data: p_error.message ?? p_error ?? 'error' };

		}

	}

	static async get_bookmark_async(p_req, p_res) {

		try {
			let v_xid = +p_req.params.xid;

			let v_row = await db.query_first_async(`select xid,xtype,xname,ST_AsGeoJSON(xgeo)::json as xgeo from xo_admin.bookmark where user_id = $1 and xid = $2`,
				[p_req.auth.user_id, v_xid]);

			return success(v_row);
		} catch (p_error) {
			return fail(p_error.message);
		}
	}

	static async add_bookmark_async(p_req, p_res) {

		try {
			let v_xobject = p_req.body.xobject;

			let v_row = await db.query_first_async(`
				insert into xo_admin.bookmark ( xtype, xname, xgeo, zoom, user_id, dts_created, dts_updated ) values( $1, $2, ST_GeomFromGeoJSON($3::json)::geometry, $4, $5::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP ) returning xid`,
				[v_xobject.xtype, v_xobject.xname, v_xobject.xgeo, v_xobject.zoom, p_req.auth.user_id]);

			return success(v_row);

		} catch (p_error) {
			return fail(p_error.message);
		}
	}

	static async delete_bookmark_async(p_req, p_res) {

		try {

			let v_xid = +p_req.params.xid;

			let v_result = await db.query_first_async(`delete from xo_admin.bookmark where user_id = $1 and xid = $2`,
				[p_req.auth.user_id, v_xid]);

			return success();

		} catch (p_error) {
			return fail(p_error.message);
		}
	}

}