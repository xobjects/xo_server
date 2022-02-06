import { success, fail, ws_packet_return } from './utils';
import db from './db';
import app from './app';
import { ws_packet_type, xobject } from './types';

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
		app.ws_server.add_handler('bookmark-list', bookmark.ws_bookmark_list_async);
		app.ws_server.add_handler('bookmark-set', bookmark.ws_bookmark_set_async);
	}

	static async get_bookmarks_async(p_req, p_res) {
		try {

			const v_result = await db.query_async(`select xid,xtype,xname,ST_AsGeoJSON(xgeo)::json as xgeo, zoom from xo.bookmark where user_xid = $1`,
				[p_req.auth.user_xid]);

			let v_rows = v_result.rows;

			return success(v_rows);
		} catch (p_error) {
			return fail(p_error.message);
		}
	}

	static async ws_bookmark_list_async(p_ws_packet: ws_packet_type): Promise<ws_packet_type> {

		try {

			const v_query = await db.query_async('select xid,xname,to_json(xgeo) xgeo,zoom from xo.bookmark where user_xid=$1::uuid order by xname', [app.user_xid]);
			return ws_packet_return(p_ws_packet, true, v_query.rows);

		} catch (p_error) {

			return ws_packet_return(p_ws_packet, false, p_error);

		}

	}

	static async ws_bookmark_set_async(p_ws_packet: ws_packet_type): Promise<ws_packet_type> {

		try {

			const v_params: {
				xobject: xobject,
				zoom: number
			} = p_ws_packet.data;

			if (!v_params.xobject) {
				throw 'invalid xobject';
			}

			if (typeof v_params.xobject.xname !== 'string') {
				throw 'invalid xobject';
			}

			if (typeof v_params.xobject.xgeo === 'undefined') {
				throw 'invalid xobject';
			}

			if (typeof v_params.zoom !== 'number') {
				throw 'invalid zoom';
			}

			const v_result = await db.query_async('insert into xo.bookmark (xname,xgeo,zoom,user_xid) values($1::text,ST_GeomFromGeoJSON($2::json)::geometry,$3::real,$4::uuid) returning xid', [v_params.xobject.xname, v_params.xobject.xgeo, v_params.zoom, app.user_xid]);
			let v_xid = v_result.rows?.[0].xid;

			return ws_packet_return(p_ws_packet, true, { xid: v_xid });

		} catch (p_error) {

			return ws_packet_return(p_ws_packet, false, p_error);

		}

	}

	static async get_bookmark_async(p_req, p_res) {

		try {
			let v_xid = +p_req.params.xid;

			let v_row = await db.query_first_async(`select xid,xtype,xname,ST_AsGeoJSON(xgeo)::json as xgeo from xo_admin.bookmark where user_xid = $1 and xid = $2`,
				[p_req.auth.user_xid, v_xid]);

			return success(v_row);
		} catch (p_error) {
			return fail(p_error.message);
		}
	}

	static async add_bookmark_async(p_req, p_res) {

		try {
			let v_xobject = p_req.body.xobject;

			let v_row = await db.query_first_async(`
				insert into xo_admin.bookmark ( xtype, xname, xgeo, zoom, user_xid, dts_created, dts_updated ) values( $1, $2, ST_GeomFromGeoJSON($3::json)::geometry, $4, $5::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP ) returning xid`,
				[v_xobject.xtype, v_xobject.xname, v_xobject.xgeo, v_xobject.zoom, p_req.auth.user_xid]);

			return success(v_row);

		} catch (p_error) {
			return fail(p_error.message);
		}
	}

	static async delete_bookmark_async(p_req, p_res) {

		try {

			let v_xid = +p_req.params.xid;

			let v_result = await db.query_first_async(`delete from xo_admin.bookmark where user_xid = $1 and xid = $2`,
				[p_req.auth.user_xid, v_xid]);

			return success();

		} catch (p_error) {
			return fail(p_error.message);
		}
	}

}