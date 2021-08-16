import events from 'events';
import db from './db';

class cacheControl extends events.EventEmitter {

	xuserList;

	constructor() {

		super();

		console.log('cacheControl now listening');

		this.on('update', (...p_args) => {
			console.log('received event');
			console.log(...p_args);
			this.updateAsync();
		});

		this.initializeAsync(); // no await

	}

	async updateAsync() {

		let v_this = this;

		setImmediate(async () => {
			console.log('updating cache');
			let v_result = await db.query_async('select * from xadmin.xuser');
			v_this.xuserList = db.get_rows(v_result);
			console.log(v_this.xuserList);
		})
	}

	async initializeAsync() {
		console.log('initializeAsync called');
	}

}

export default new cacheControl();