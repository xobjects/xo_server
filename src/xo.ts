import fastify from 'fastify';

import shortid from 'shortid';
import { v4 as uuid } from 'uuid';
import db from './db';
import logger from './logger';
import { success, fail, valid_postgres_identifier } from './utils';

import { validateAccessAsync as xAuth_validateAccessAsync } from './xAuth';
import cacheControl from './cacheControl';

import { layerset } from './layerset';
import { layer } from './layer';
import { bookmark } from './bookmark';
import { user } from './user';
import { geocode } from './geocode';

export abstract class xo {

	static routes(p_fastify, p_options, p_done) {
		console.log('xo routes');

		//p_fastify.register(layer.routes, { prefix: '/xo' });
		//p_fastify.register(layerset.routes, { prefix: '/xo' });
		//p_fastify.register(bookmark.routes, { prefix: '/xo' });
		//p_fastify.register(user.routes, { prefix: '/xo' });
		//p_fastify.register(geocode.routes, { prefix: '/xo' });

		//p_fastify.get('/bookmark/list', bookmark.get_bookmarks_async);
		//p_fastify.post('/bookmark/add', bookmark.add_bookmark_async);
		//p_fastify.get('/bookmark/get/:xid', bookmark.get_bookmark_async);
		//p_fastify.get('/bookmark/delete/:xid', bookmark.delete_bookmark_async);

		p_done();
	}

}

export async function routes(p_fastify, p_options, p_done) {

	p_fastify.get('/', async (p_req, p_res) => {
		p_res.send('xobjects api - authorized use only.');
	});

	/*
	
	p_fastify.get('/test', testAsync);
	p_fastify.post('/update_map', update_map_async);
	
	p_fastify.get('/xcompanylist', xCompanyListAsync);
	p_fastify.get('/xcompany/:field/:value/:type', get_xCompanyAsync);
	p_fastify.post('/xcompany', post_xCompanyAsync);
	
	p_fastify.get('/xuserlist', xUserListAsync);
	p_fastify.post('/xuser', xUserAsync);
	
	p_fastify.post('/xlayer', xlayer_async);
	
	p_fastify.post('/xobject', xobject_async);
	
	p_fastify.get('/xlayerlist', xLayerListAsync);
	p_fastify.get('/xschema', xSchema);
	
	p_fastify.get('/integrity', integrity_async);
	
	layerset.routes(p_fastify);
	layer.routes(p_fastify);
	
	logger.i('xObject routes setup', 'xobjects', 'routes');
	
	
	*/

	p_done();

}

function xo_async(p_req, p_res) {
	p_res.send('hello from xo api');
}

/*
        this.server.get('/*', this.get_static.bind(this));
        this.server.get('/test', this.get_testAsync.bind(this));
        this.server.post('/updatemap', this.updateMapAsync.bind(this));
 
        this.server.get('/xcompanylist', this.get_xCompanyListAsync.bind(this));
        this.server.get('/xcompany/:field/:value/:type', this.get_xCompanyAsync.bind(this));
        this.server.post('/xcompany', this.post_xCompanyAsync.bind(this));
 
        this.server.get('/xuserlist', this.get_xUserListAsync.bind(this));
        this.server.post('/xuser', this.post_xUserAsync.bind(this));
 
        this.server.post('/xlayer', this.post_xLayerAsync.bind(this));
 
        this.server.post('/xobject', this.post_xObject.bind(this));
 
        this.server.get('/xlayerlist', this.get_xLayerListAsync.bind(this));
        this.server.get('/xschema', this.get_xSchema.bind(this));
 
        */

async function testAsync(p_req, p_res) {

	let id = shortid.generate();
	console.log(id);
	p_res.send('hello');

	let v_user_id: string = '82dde3a8-024c-4437-aa48-a8bc95110e36';
	try {
		let v_tq = await db.get_default_user_layerset(v_user_id);
		console.log(v_tq);
	} catch (p_error) {
		console.log(p_error.message);
	}

	/*
	xAuth_validateAccessAsync(p_req).then((p_access: any) => {

		let v_data = {
			date: new Date().toLocaleString(),
			son: 'james', age: 23, msg: `hello ${p_access.xuser.xname}`
		};

		p_res.send(success(v_data));

	}).catch(p_error => {

		p_res.send(error(p_error));

	});
	*/
}

async function template(p_req, p_res) {
	xAuth_validateAccessAsync(p_req).then(p_access => {
		p_res.send(success());
	}).catch(p_error => {
		p_res(fail(p_error));
	});
}

async function xLayerListAsync(p_req, p_res) {

	xAuth_validateAccessAsync(p_req).then(async (p_access: any) => {

		let v_xLayerList = await db.simple_rows_async('xadmin.xlayer', 'xuserid', p_access.xuser.xid, 'uuid');
		p_res.send(success(v_xLayerList));

	}).catch(p_error => {

		p_res.send(fail(p_error));

	});

}

async function xCompanyListAsync(p_req, p_res) {
	try {
		let v_xCompanyList = await db.xcompany_list_async();
		return success(v_xCompanyList);
	} catch (p_error) {
		return fail(p_error);
	}
}

async function get_xCompanyAsync(p_req, p_res) {
	try {
		console.log(p_req);
		let v_xCompany = await db.xcompany_async(p_req.params.field, p_req.params.value, p_req.params.type);
		return success(v_xCompany);
	} catch (p_error) {
		return fail(p_error);
	}
}

async function post_xCompanyAsync(p_req, p_res) {

	let v_xCompany = await db.xcompany_async('xname', p_req.params.xname, 'text');

	if (v_xCompany) {

		return fail('company already exists');

	} else {

		let v_retval = await db.query_async(`
				insert into xadmin.xcompany ( xid, xtype, xname, created, updated )
				values( $1::uuid, $2::text, $3::text, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP )	
				returning xid`,
			[uuid(), 'company', p_req.params.xname]);

		let v_xCompanyId = v_retval && v_retval.rowCount && v_retval.rows && v_retval.rows[0].xid;
		v_xCompany = await db.simple_row_async('xadmin.xcompany', 'xid', v_xCompanyId, 'uuid');

		return success(v_xCompany);
	}
}

async function update_map_async(p_req, p_res) {
	try {
		logger.i('update map', 'xobjects', 'map');

		let v_xid_list = p_req.body.xid_list || [];
		v_xid_list.push(-1);

		let v_bounds_xgeo = p_req.body.bounds_xgeo;

		let v_layer = await db.simple_row_async('xo_admin.layer', 'xid', p_req.body.layer_id, 'int');
		let v_layerset = await db.simple_row_async('xo_admin.layerset', 'xid', v_layer.layerset_id, 'int');

		let v_fqn = v_layerset.schema + '.' + v_layer.table_name;
		let v_fc = await db.mapdata_async(v_fqn, v_xid_list, v_bounds_xgeo);

		return success(v_fc);

	} catch (p_error) {
		console.log(p_error);
		return fail(p_error);
	}

}

/*
async function xlayer_async(p_req, p_res) {

	let v_in = p_req.params;

	let v_xUser = await db.xuser_async('xid', v_in.xid, 'int');
	console.log(v_xUser);

	await db.create_xlayer(`u${v_xUser.xid}`, 'bdg');
}
*/

async function xobject_async(p_req, p_res) {

	try {
		let v_xobject = p_req.body.xobject;
		let v_layerset_id = p_req.body.layerset_id;
		let v_layer_id = p_req.body.layer_id;

		let v_xlayer = v_xobject.xlayer;

		let v_layerset = await db.simple_row_async('xo_admin.layerset', 'xid', v_layerset_id, 'int');
		let v_layer = await db.simple_row_async('xo_admin.layer', 'xid', v_layer_id, 'int');

		if (!v_layerset) {
			// give error
			return fail('invalid layerset');
		}

		if (!v_layer) {
			// give error
			return fail('invalid layer');
		}

		let v_fl = `${v_layerset.schema}.${v_layer.table_name}`;

		let v_row = await db.query_first_async(`
			insert into ${v_fl} ( xtype, xname, xgeo, dts_created, dts_updated ) values( $1, $2, ST_GeomFromGeoJSON($3::json)::geometry, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP ) returning xid`,
			[v_xobject.xtype, v_xobject.xname, v_xobject.xgeo]);

		return success(v_row);

	} catch (p_error) {
		console.log(p_error);
	}

}

async function xUserAsync(p_req, p_res) {

	let v_xUser = await db.xuser_async('xname', p_req.params.xname, 'text');

	if (v_xUser) {
		return fail('user already exists');
	}

	if (p_req.params.xcompanyid) {

		let v_xCompany = await db.xcompany_async('xid', p_req.params.xcompanyid, 'uuid');

		if (!v_xCompany) {
			return fail(`invalid xCompanyId ${p_req.params.xcompanyid}`);
		}

	}

	let v_xUserId = uuid();

	let v_retval = await db.query_async(`
			insert into xadmin.xuser ( xid, xtype, xname, password, xcompanyid, created, updated )
			values( $1::uuid, $2::text, $3::text, $4::text, $5::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP )	
			returning xid`,
		[v_xUserId, 'user', p_req.params.xname, p_req.params.password, p_req.params.xcompanyid,]);

	v_xUser = await db.simple_row_async('xadmin.xuser', 'xid', v_xUserId, 'uuid');

	return success(v_xUser);

	//await db.queryAsync(`create schema u${v_xId}`);
	//await db.createXLayerTableInSchemaAsync(`u${v_xId}`);
	//await db.createXLayer('u1', 'xl1');
}

async function xUserListAsync(p_req, p_res) {
	try {
		let v_xUserList = await db.xuser_list_async();
		return success(v_xUserList);
	} catch (p_error) {
		return fail(p_error);
	}
}

async function xSchema(p_req, p_res) {

	xAuth_validateAccessAsync(p_req).then(async (p_access: any) => {

		// see if xuser schema exists, if not create it

		let v_xschema = await db.simple_row_async('xadmin.xschema', 'xuserid', p_access.xuser.xid, 'uuid');

		if (v_xschema) {

			let v_schema = await db.simple_row_async('information_schema.schemata', 'schema_name', v_xschema.xname, 'text');

			if (!v_schema) {

				await db.query_async(`create schema ${v_xschema.xname};`);
				p_res.send(success('created schema'));

			} else {
				p_res.send(success('schema exists'));
			}

		} else {

			return success('no xschema row - creating');
			await db.query_async('insert into xadmin.xschema ( xtype, xname, xuserid, created, updated ) values ( $1::text, $2::text, $3::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP );',
				['user', 'user_' + p_access.xuser.xname, p_access.xuser.xid]);
		}

	}).catch(p_error => {

		return fail(p_error);

	});

}

async function integrity_async(p_req, p_res) {
	let v_sql = `
select ls.xname, l.table_name, t.schemaname, t.tablename from xo_admin.layerset ls
inner join xo_admin.layer l on l.layerset_id = ls.xid
full outer join pg_tables t on t.schemaname = ls.xname and t.tablename = l.table_name
where t.schemaname not in ( 'pg_catalog', 'information_schema', 'public', 'xo_admin' ) and
(t.schemaname is null or ls.xname is null);`

	let v_result = await db.query_async(v_sql);
	let v_rows = db.get_rows(v_result);
	return success(v_rows);
}