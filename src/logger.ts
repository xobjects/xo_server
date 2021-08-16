import fs from 'fs';

class logger {

	logfile;
	queue;
	busy;

	constructor() {
		this.logfile = 'xobjects.log';
		this.queue = [];

		setInterval(this.processQueue.bind(this), 500);
	}

	processQueue() {

		if (this.busy) {
			return;
		}

		try {
			this.busy = true;

			for (; ;) {

				let v_entry = this.queue.shift();

				if (!v_entry) {
					return;
				}

				fs.appendFile(this.logfile, JSON.stringify(v_entry) + '\n', p_error => { });
			}
		}
		finally {
			this.busy = false;
		}
	}

	async log(p_level, p_text, ...p_tags) {
		this.queue.push({
			dts: new Date(),
			level: p_level,
			text: p_text,
			tags: p_tags
		});
	}

	async e(p_text, ...p_tags) {
		this.log('e', p_text, ...p_tags);
	}

	async w(p_text, ...p_tags) {
		this.log('w', p_text, ...p_tags);
	}

	async i(p_text, ...p_tags) {
		this.log('i', p_text, ...p_tags);
	}

	async d(p_text, ...p_tags) {
		this.log('d', p_text, ...p_tags);
	}

	async t(p_text, ...p_tags) {
		this.log('t', p_text, ...p_tags);
	}

}

let v_singleton = new logger();

export default v_singleton;