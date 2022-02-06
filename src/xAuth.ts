//import { v4 as uuid } from 'uuid';
import db from './db';

export default async function (p_fastify, p_options, p_done) {
	p_fastify.get('/james', james);
	p_fastify.get('/authorize', (p_req, p_res) => p_res.redirect('/xologin.html'));
	p_fastify.get('/authenticate', authenticate);
	p_fastify.post('/token', token);
	p_done();
}

function uuid() {
	return 'abcd';
}

async function authenticate(p_req, p_res) {
	let v_login = p_req.query.login;
	let v_password = p_req.query.password;

	let v_xuser = await db.xuser_async('xname', v_login, 'text');

	let v_xauthid = uuid();

	let v_retval = await db.query_async(`
			insert into xadmin.xauth ( xid, xuserid, xclientid, isvalid, created, updated )
			values( $1::uuid, $2::uuid, $3::uuid, $4::boolean, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP )	
			returning xid`,
		[v_xauthid, v_xuser.xid, null, 'y']);

	if (v_xuser.password === v_password) {
		let v_html = `<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\"><html><head><title>code=${v_xauthid}</title></head><script>CODE='${v_xauthid}';setInterval(function() {{ parent.postMessage('CODE=' + CODE, '*'); }},200);</script><body style='visibility:hidden'>Successful login<br>code=${v_xauthid}</body></html>`;
		p_res
			.header('Content-Type', 'text/html')
			.send(v_html);
	} else {
		console.log('password incorrect');
	}
}

async function token(p_req, p_res) {

	console.log(`post_xauth_token - grant_type - ${p_req.body.grant_type}`);

	if (p_req.body.grant_type === 'authorization_code') {

		/* returns {
			access_token,
			token_type : 'Bearer',
			expires_in,
			refresh_token,
			scope,
		}
		*/

		let v_client = await db.client_async();

		await v_client.query('begin');

		let v_xauth = await db.simple_row_async('xadmin.xauth', 'xid', p_req.body.code, 'uuid', v_client);

		console.log(v_xauth);

		if (!v_xauth) {
			console.error(`xauth record not found - ${p_req.body.code}`)
			p_res.send('error');
			p_res.end();
		}

		if (!v_xauth.isvalid) {
			console.error(`xauth record not valid - ${p_req.body.code}`)
			p_res.send('error');
			p_res.end();
		}

		await db.query_async('update xadmin.xauth set isvalid = false, updated = CURRENT_TIMESTAMP where xid = $1::uuid',
			[v_xauth.xid], v_client);

		let v_xrefreshtokenid = uuid();

		let v_retval = await db.query_async(`
			insert into xadmin.xrefreshtoken ( xid, xauthid, isvalid, expires, created, updated )
			values( $1::uuid, $2::uuid, true, CURRENT_TIMESTAMP + interval '1 year', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP )`,
			[v_xrefreshtokenid, v_xauth.xid], v_client);

		let v_xaccesstokenid = uuid();

		await db.query_async(`
			insert into xadmin.xaccesstoken ( xid, xrefreshtokenid, isvalid, expires, created, updated )
			values( $1::uuid, $2::uuid, true, CURRENT_TIMESTAMP + interval '1 day', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP )`,
			[v_xaccesstokenid, v_xrefreshtokenid], v_client);

		await v_client.query('commit');
		await v_client.release();

		return {
			access_token: v_xaccesstokenid,
			token_type: 'Bearer',
			// expires_in
			refresh_token: v_xrefreshtokenid,
			scope: 'xobjects'
		};

	} else if (p_req.body.grant_type === 'refresh_token') {

		/* returns {
			access_token,
			token_type : 'Bearer',
			expires_in,
			refresh_token,
			scope,
		}
		*/

		let v_client = await db.client_async();

		await v_client.query('begin');

		let v_xrefreshtoken = await db.simple_row_async('xadmin.xrefreshtoken', 'xid', p_req.body.refresh_token, 'uuid');

		if (!v_xrefreshtoken) {
			console.error(`xrefreshtoken record not found - ${p_req.body.refresh_token}`)
			p_res.send('error');
			p_res.end();
		}

		if (!v_xrefreshtoken.isvalid) {
			console.error(`xrefreshtoken record not valid - ${p_req.body.xrefresh_token}`)
			p_res.send('error');
			p_res.end();
		}

		let v_xaccesstokenid = uuid();

		await db.query_async(`
			insert into xadmin.xaccesstoken ( xid, xrefreshtokenid, isvalid, expires, created, updated )
			values( $1::uuid, $2::uuid, true, CURRENT_TIMESTAMP + interval '1 day', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP )`,
			[v_xaccesstokenid, v_xrefreshtoken.xid], v_client);

		await v_client.query('commit');
		await v_client.release();

		return {
			access_token: v_xaccesstokenid,
			token_type: 'Bearer',
			// expires_in
			refresh_token: v_xrefreshtoken.xid,
			scope: 'xobjects'
		};

	}

}

async function james(p_req, p_res) {
	return { son: 'james', age: 23, status: 'single' };
}

export function validateAccessAsync(p_req) {

	return new Promise(async (p_resolve, p_reject) => {

		try {

			if (p_req.headers.authorization && p_req.headers.authorization.match(/^Bearer/)) {
				let v_access_token = p_req.headers.authorization.substring(7);

				let v_sql = `
                    select t1.* from xadmin.xuser t1
                    inner join xadmin.xauth t2 on t2.xuserid = t1.xid
                    inner join xadmin.xrefreshtoken t3 on t3.xauthid = t2.xid
                    inner join xadmin.xaccesstoken t4 on t4.xrefreshtokenid = t3.xid and
                    t4.isvalid and t4.xid = $1::uuid`;

				let v_result = await db.query_async(v_sql, [v_access_token]);
				let v_xuser = db.get_first_row(v_result);

				if (v_xuser) {
					p_resolve({
						xuser: v_xuser
					});
				}

			}

		} catch (p_error) {
			console.log(p_error);
		}

		// give temp access as user
		let v_result = await db.query_async("select * from xadmin.xuser where xname = 'gk'");
		let v_xuser = db.get_first_row(v_result);

		if (v_xuser) {
			p_resolve({ xuser: v_xuser });
		}

		p_reject();

	});
}