import pg from 'pg';
import { timingSafeEqual } from 'crypto';

import { Pool } from 'pg';
import { db_base } from './db_base';
import { Geometry } from '@turf/helpers';

class db extends db_base {

	constructor() {
		super('xobjects');
	}

	async xcompany_async(p_field, p_value, p_type, p_client = null) {
		let v_result = await this.query_async(`select * from xadmin.xcompany where ${p_field} = $1::${p_type}`, [p_value], p_client);
		return this.get_first_row(v_result);
	}

	async xcompany_list_async(p_sort = 'xid', p_client = null) {
		let v_result = await this.query_async(`select * from xadmin.xcompany order by ${p_sort}`, null, p_client);
		return v_result && v_result.rows;
	}

	async xuser_async(p_field, p_value, p_type, p_client = null) {
		let v_result = await this.query_async(`select * from xadmin.xuser where ${p_field} = $1::${p_type}`, [p_value], p_client);
		return this.get_first_row(v_result);
	}

	async xuser_list_async(p_sort = 'xid', p_client = null) {
		let v_result = await this.query_async(`select * from xadmin.xuser order by ${p_sort}`, null, p_client);
		return v_result && v_result.rows;
	}

	async mapdata_2_async(p_table: string, p_xid_list: number[]) {

		let v_sql = `
	select row_to_json(fc)
	from (
		select 
		'FeatureCollection' as "type",
		array_to_json(array_agg(f)) as "features"
		from (
			select 
                'Feature' as type, 
                xtype || '.' || xid as id,
				ST_AsGeoJSON( xgeo )::json as geometry,
				(
					select row_to_json(t) from ( select xid, xtype, xname, 'james' as son ) t
				) as properties
            from ${p_table} 
            where not(xid = ANY( $1::int[] ))
            order by xid
            fetch first 500 rows only
		)	as f
    ) as fc;`;
		let v_result = await this._pool.query(v_sql, [p_xid_list]);

		// since the result is converted to json by pg, there should be one result row.
		// json object should look like { type : 'FeatureCollection', features: [] }

		let v_fc = v_result.rowCount === 1 && v_result.rows[0].row_to_json;

		if (v_fc.type === 'FeatureCollection') {

			if (v_fc.features) {
				console.log(`FeatureCollection: (${p_table}) : ${v_fc.features.length} features`);
			} else {
				console.log(`FeatureCollection: {${p_table}) : 0 features`);
			}

			return v_fc;
		}

	}

	async mapdata_async(p_table: string, p_xid_list: number[], p_bounds) {

		let v_sql = `
	select row_to_json(fc)
	from (
		select 
		'FeatureCollection' as "type",
		array_to_json(array_agg(f)) as "features"
		from (
			select 
                'Feature' as type, 
                xtype || '.' || xid as id,
				ST_AsGeoJSON( xgeo )::json as geometry,
				(
					select row_to_json(t) from ( select xid, xtype, xname, 'james' as son ) t
				) as properties
            from ${p_table} 
            where not(xid = ANY( $1::int[] )) and ST_Intersects( xgeo, ST_GeomFromGeoJSON($2::json)::geometry )
            order by xid
            fetch first 500 rows only
		)	as f
    ) as fc;`;
		let v_result = await this._pool.query(v_sql, [p_xid_list, p_bounds]);

		// since the result is converted to json by pg, there should be one result row.
		// json object should look like { type : 'FeatureCollection', features: [] }

		let v_fc = v_result.rowCount === 1 && v_result.rows[0].row_to_json;

		if (v_fc.type === 'FeatureCollection') {

			if (v_fc.features) {
				console.log(`FeatureCollection: (${p_table}) : ${v_fc.features.length} features`);
			} else {
				console.log(`FeatureCollection: {${p_table}) : 0 features`);
			}

			return v_fc;
		}

	}

	//	ST_AsGeoJSON( ST_Transform( xgeo, 3857 ) )::json as geometry,
	//where not(xid = ANY( $1::int[] )) and ST_Intersects( xgeo, ST_Transform( ST_GeomFromGeoJSON($2::json)::geometry, 4326) )

	async test() {

		let v_sql = `
	select row_to_json(fc)
	from (
		select 
		'FeatureCollection' as "type",
		array_to_json(array_agg(f)) as "features"
		from (
			select 
				'Feature' as type, 
				ST_AsGeoJSON( ST_Transform( geo, 3857 ) )::json as geometry,
				(
					select row_to_json(t) from ( select id, name ) t
				) as properties
			from bdg
		)	as f
	) as fc;`;

		//await v_client.connect();
		//let v_t0 = tick();
		let v_result = await this._pool.query(v_sql);
		//let v_t1 = tick();
		//await v_client.end();

		//console.log( v_result );
		console.log('=================================');
		console.log(`count: ${v_result.rows.length}`);

		let v_fc = v_result.rows[0].row_to_json;

		console.log(`features: ${v_fc.features.length} `);
	}

	async get_default_user_layerset(p_user_id): Promise<any> {
		let v_sql = 'select * from xo_admin.layerset where user_id = $1::uuid and is_default';
		let v_result = await this._pool.query(v_sql, [p_user_id]);
		return this.get_first_row(v_result);
	}

	async get_layerset_layers(p_layerset_id: number): Promise<any[]> {
		let v_result = await this.query_async("select * from xo_admin.layer where layerset_id = $1::int", [p_layerset_id]);
		return this.get_rows(v_result);
	}

	async get_layers(): Promise<any[]> {
		let v_result = await this.query_async("select * from xo_admin.layer");
		return this.get_rows(v_result);
	}

	// //

	async xlayer_list_async(p_schema: string) {

		let v_sql = `
        select array_to_json(array_agg(row_to_json(t)))
        from (
          select xid,xtype,xname, ST_AsGeoJSON(ST_Transform(xgeo, 3857 ))::json as xgeo from ${p_schema}.xlayer
        ) t`;

		let v_result = await this._pool.query(v_sql);
		let v_list = v_result.rows[0].array_to_json;
		return v_list;
	}

	async xlayer_feature_collection_async(p_schema: string) {

		let v_sql = `
        select array_to_json(array_agg(row_to_json(t)))
        from (
          select xid,xtype,xname, ST_AsGeoJSON(ST_Transform(xgeo, 3857 ))::json as xgeo from ${p_schema}.xlayer
        ) t`;

		let v_result = await this._pool.query(v_sql);
		let v_list = v_result.rows[0].array_to_json;
		return v_list;
	}

	async create_layer_async(p_schema: string, p_table_name: string, p_client: pg.PoolClient = null) {

		let v_sql = `
			create table ${p_schema}.${p_table_name} (
				xid serial not null,
				xtype text,
				xname text,
				xgeo geometry,
				xstyle jsonb,
				dts_created timestamp not null,
				dts_updated timestamp,
            	--
            	constraint pk_${p_table_name} primary key (xid)
			)
		`;

		return await this.query_async(v_sql, null, p_client);
	}

	transaction_begin_async(p_client) {
		return this.query_first_async('begin', null, p_client);
	}

	transaction_commit_async(p_client) {
		return this.query_first_async('commit', null, p_client);
	}

	transaction_rollback_async(p_client) {
		return this.query_first_async('rollback', null, p_client);
	}

	async transform_async(p_geo: Geometry, p_from: number = 4326, p_to: number = 3857): Promise<Geometry> {
		const v_sql = `SELECT row_to_json(t) json from ( select ST_Transform(ST_SetSRID( ST_GeomFromGeoJSON($1::json)::geometry, $2::int ),$3::int) geo) t`;
		const v_result = await this.query_async(v_sql, [p_geo, p_from, p_to]);
		return v_result?.rows?.[0]?.json?.geo;
	}

}

export default new db();