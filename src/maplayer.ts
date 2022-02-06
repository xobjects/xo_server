import { base_object } from './base_object';
import { composer } from './composer';

export interface maplayer extends base_object {
	is_maplayer: boolean,
	layer_name: string,
	add_feature: () => void,
	add_features: () => void
}

export const maplayer = composer<maplayer>({
	base_object,

	[composer.init]() {
		console.log('maplayer', 'init called');
	},

	is_maplayer: true,

	layer_name: 'new layer name',

	add_feature() {
		console.log('add_feature');
	},

	add_features() {
		console.log('add_features');
		this.add_feature();
		this.add_feature();
	},

	[composer.static]: {
		quagmire: function () {
			console.log('quagmire on fire');
		},

		tq: () => 'hello',

		son: 'james'
	},


});