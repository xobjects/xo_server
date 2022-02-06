import { composer } from './composer';
import { maplayer } from './maplayer';

export interface draw_maplayer extends maplayer {
	is_draw_maplayer: boolean,
	name: string,
	highlight_feature: () => void
}

export const draw_maplayer = composer<draw_maplayer>({
	maplayer,
	is_draw_maplayer: true,
	name: 'draw',

	[composer.init]() {
		console.log('draw_maplayer', 'init called');
	},

	highlight_feature() {
		console.log('highlight feature');
	}
});