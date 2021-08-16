import { http_async } from './http';
import { success, fail } from './utils';
import { decode as flexible_polyline_decode } from './flexible_polyline';

/*
here.com

oauth2 info
access key id: avu7tuiRYAT-j0iA424y1w
access key secret: ASfo2Trpsj9u94smGBZVZ9jcwicmxh1YuMxfcQmxj_4iXnfEu3SKDOGhGm-Rk7vdPY6QJRG97Qe2YqoQnYBdoA

apikey

apiKey=4AxvLKySh6QYK4VMw5mFaeivkX8A7gRaMW0FNRODGDU&waypoint0=geo!52.2,13.4&Waypoint1=geo!52.5,13.45&mode=shortest;pedestrian


*/

export abstract class geocode {

	static apiKey: string = '4AxvLKySh6QYK4VMw5mFaeivkX8A7gRaMW0FNRODGDU';

	static routes(p_fastify, p_options, p_done) {

		console.log('geocode routes');

		p_fastify.get('/geocode/geocode_address/:address', geocode.geocode_address_async);

		p_done();
	}

	static async geocode_address_async(p_req, p_res) {

		let v_result = await geocode.geocode_async(p_req.params.address);
		return success(v_result);
	}

	static async geocode_async(p_address: string) {

		let v_tq = { polyline: 'BGo9llkDg_rzZkF0G8LoQ4NoQgP8QoLgKgyB0tB4XoVoLsJ0K4IwWoQsOsJ8LwHoLoGkS0KkN8GsJ0F8GgF4D4DsE0FwHoLUgK8BkIkDkIgFwHgFwCgFUgF7B4DjDsErEsE_EkD7GoLUgFoB0F8B8Q0FsE8BkmBkSgtBwWkS8GwH8B8GoBosCgKkhBsE0FU0FUgZjD8VgKoGkD4F8C' };
		let v_polyline = flexible_polyline_decode(v_tq.polyline);

		debugger;

		let v_url = `https://geocoder.ls.hereapi.com/6.2/geocode.json?apiKey=${geocode.apiKey}&searchtext=${encodeURIComponent(p_address)}`;

		try {
			let v_result = await http_async({ url: v_url, type: 'json' });
			let v_results = v_result.Response.View &&
				v_result.Response.View.length > 0 &&
				v_result.Response.View[0] &&
				v_result.Response.View[0].Result;

			v_results = v_results.map(p_result => ({
				location: {
					x: p_result.Location.NavigationPosition[0].Longitude,
					y: p_result.Location.NavigationPosition[0].Latitude
				},
				address: p_result.Location.Address.Label
			}));

			//	return v_result.Response.View[0].Result[0].Location.NavigationPosition[0];
			return v_results;

		} catch (p_error) {
			console.log(p_error);
		}
	}
}