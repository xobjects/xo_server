import { v4 as uuid } from 'uuid';

import { ws_server } from './ws_server';

const user_xid = '82DDE3A8-024C-4437-AA48-A8BC95110E36';
let _ws_server;

type access_token_entry = {
	access_token: string,
	user_xid: string,
	valid: boolean
};

const access_token_list = [] as access_token_entry[];

async function get_access_token_async() {

	let v_entry = access_token_list.find(x => x.user_xid === user_xid);

	if (!v_entry) {
		v_entry = {
			access_token: uuid(),
			user_xid: user_xid,
			valid: true
		}

		access_token_list.push(v_entry);
	}

	return v_entry.access_token;
}

async function validate_access_token_async(p_access_token) {
	let v_entry = access_token_list.find(x => x.access_token === p_access_token);
	return v_entry?.valid ? v_entry.user_xid : undefined;
}

export default {
	user_xid,
	get ws_server() { return _ws_server; },
	set ws_server(p_ws_server: ws_server) { _ws_server = p_ws_server; },
	get_access_token_async,
	validate_access_token_async
}
