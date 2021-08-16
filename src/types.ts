//import { AllGeoJSON, GeoJSONObject, Geometry as turf_Geometry } from '@turf/turf';
import { url } from 'inspector';
import { builtinModules } from 'module';

export type ws_packet_type = {
	id?: number,
	action: string,
	successful?: boolean,
	data?: any
}

export type ws_result_type = {
	successful: boolean,
	data?: any,
	msg?: string
};

export interface xobject_row {
	xtype: string,
	xid: number,
	xname: string
};

export interface layer_row extends xobject_row {
	schema_name: string,
	table_name: string
};
