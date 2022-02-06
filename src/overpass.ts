import fetch from 'node-fetch';
import * as turf from '@turf/turf';
import app from './app';
import { ws_packet_type } from './types';
import { ws_packet_return } from './utils';

export default {
	add_handlers
}

function add_handlers() {
	app.ws_server.add_handler('overpass', overpass_async);
}

async function overpass_async(p_ws_packet: ws_packet_type): Promise<ws_packet_type> {

	try {

		const v_params: {
			center: number[],
			radius: number
		} = p_ws_packet.data;

		const v_fc = await overpass_query_async(v_params.center, v_params.radius);

		return ws_packet_return(p_ws_packet, true, v_fc);
	} catch (p_error) {
		return ws_packet_return(p_ws_packet, false, p_error);
	}

}

export async function overpass_query_async(p_center: number[], p_radius: number): Promise<turf.FeatureCollection> {

	const v_url = `http://overpass-api.de/api/interpreter?data=[out:json][timeout:30];(way["building"](around: ${p_radius},${p_center[1]},${p_center[0]}););out body;>;out skel qt;`;
	/*
	const v_url = 'http://overpass-api.de/api/interpreter?data=[out:json][timeout:30];(way["building"](around: 250.0,43.049643667662224,-75.38017117070612););out body;>;out skel qt;';
	const v_url2 = 'http://overpass-api.de/api/interpreter?data=[out:json][timeout:30];(way["building"](43.07807924321489, -75.337379059068,43.106975424409185, -75.2763059184843););out body;>;out skel qt;';
	*/

	let v_response = await fetch(v_url);

	if (v_response.status === 200) {
		const v_json = await v_response.json();
		let v_nodes = v_json.elements.filter(x => x.type === 'node');

		let v_ways = v_json.elements.filter(x => x.type === 'way');

		const v_features = v_ways.map(v_way => {

			const v_coords = v_way.nodes.map(wx => {
				const v_node = v_nodes.find(nx => nx.id == wx);
				if (v_node) {
					return [v_node.lon, v_node.lat];
				} else {
					return;
				}
			}) as turf.helpers.Position[];

			if (v_coords.length < 4) {
				console.log('points', v_coords.length);
				return;
			} else {
				const v_feature = turf.polygon([v_coords], { name: v_way.name ?? 'no-name' }, { id: v_way.id });
				return v_feature;
			}
		});

		return turf.featureCollection(v_features);

	}

}