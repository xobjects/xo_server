import { nextTick } from 'process';
import { getConstantValue, ObjectFlags } from 'typescript';
import { composer } from './composer';

const _unique_id = {
	value: 0,
	get next() {
		return ++this.value;
	}
}

export interface base_object {
	id: number,
	is_base_object: boolean
}

export const base_object = composer<base_object>({
	id: 0,
	is_base_object: true,
	[composer.init]() {
		console.log('base_object', 'init called');
		this.id = _unique_id.next;
	},
});