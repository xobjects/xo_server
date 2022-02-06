//import { AllGeoJSON, GeoJSONObject, Geometry as turf_Geometry } from '@turf/turf';
import * as turf from '@turf/turf';

import { url } from 'inspector';
import { builtinModules } from 'module';
import { TupleTypeReference } from 'typescript';

export type ws_packet_type = {
	id?: number,
	action: string,
	successful?: boolean,
	data?: any
};

export type ws_context = {
	user_xid?: string,
	owner_xid?: string,
	session_id: string,
	dts: Date,
	authorized: boolean
};

export type ws_result_type = {
	successful: boolean,
	data?: any,
	msg?: string
};

export type xobject = {
	xtype?: string,
	xid: number,
	xname?: string
	xgeo?: turf.Geometry
};

export interface xobject_row {
	xtype: string,
	xid: number,
	xname: string
};

export interface layer_row extends xobject_row {
	owner_xid: string,
	schema_name: string,
	table_name: string
};

export interface user {
	xid: string,
	owner_xid: string
};

export interface layerset {
	xid: number,
	xname: string,
	xgeo: turf.Geometry,
	schema_name: string,
	owner_xid: string,
	xuuid: string
}

export interface owner_row extends xobject_row { };