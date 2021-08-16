import pg, { Pool } from 'pg';

export class db_base {

	_pool: Pool;

	constructor(p_database: string = 'postgres') {

		let v_this = this;

		pg.defaults.poolSize = 3;

		v_this._pool = new pg.Pool({
			user: 'xo',
			host: 'localhost',
			//database: 'xobjects',
			database: p_database,
			password: 'xodb$',
			port: 5432
		});

		let v_values = {
			totalCount: undefined,
			idleCount: undefined,
			waitingCount: undefined
		}

		setInterval(() => {

			if (v_this._pool.totalCount != v_values.totalCount ||
				v_this._pool.idleCount != v_values.idleCount ||
				v_this._pool.waitingCount != v_values.waitingCount) {

				console.log(`*** pg connect: totalCount ${v_this._pool.totalCount}, idleCount ${v_this._pool.idleCount}, waitingCount ${v_this._pool.waitingCount}`);

				v_values = {
					totalCount: v_this._pool.totalCount,
					idleCount: v_this._pool.idleCount,
					waitingCount: v_this._pool.waitingCount
				};

			}

		}, 5000);

	}

	async client_async(): Promise<pg.PoolClient> {
		return this._pool.connect();
	}

	async query_async(p_sql: string, p_params: any[] = null, p_client: pg.PoolClient = null) {
		return (p_client || this._pool).query(p_sql, p_params);
	}

	async query2_async(p_sql: string, p_object?: any, p_client?: pg.PoolClient) {
		return (p_client || this._pool).query(p_sql, p_object);
	}

	async query_first_async(p_sql: string, p_params: any[] = null, p_client: pg.PoolClient = null) {
		let v_result = await (p_client || this._pool).query(p_sql, p_params);
		return this.get_first_row(v_result);
	}

	get_rows(p_result: pg.QueryResult): any[] {
		//return p_result && p_result.rowCount && p_result.rows;
		return p_result && p_result.rows;
	}

	get_first_row<T = any>(p_result: pg.QueryResult): T | undefined {
		let v_row = p_result && p_result.rowCount > 0 && p_result.rows && p_result.rows[0];
		return v_row as T || undefined;
	}

	async simple_row_async(p_table: string, p_field: string, p_value: any, p_type: string, p_client: pg.PoolClient = null) {
		let v_result = await this.query_async(`select * from ${p_table} where ${p_field} = $1::${p_type}`, [p_value], p_client);
		return this.get_first_row(v_result);
	}

	async simple_rows_async(p_table: string, p_field: string, p_value: any, p_type: string, p_client: pg.PoolClient = null) {
		let v_result = await this.query_async(`select * from ${p_table} where ${p_field} = $1::${p_type}`, [p_value], p_client);
		return this.get_rows(v_result);
	}

	async get_schema_list_async() {
		let v_result = await this.query_async('select nspname as schema from pg_catalog.pg_namespace');
		return this.get_rows(v_result);
	}

	async get_table_list_async(p_schema: string) {
		let v_result = await this.query_async('select schemaname, tablename, tableowner from pg_tables where schemaname = $1::text', [p_schema]);
		return this.get_rows(v_result);
	}

	async get_view_list_async(p_schema: string) {
		let v_result = await this.query_async('select schemaname, viewname, viewowner from pg_views where schemaname = $1::text', [p_schema]);
		return this.get_rows(v_result);
	}

	async table_exists_async(p_schema: string, p_table: string) {
		let v_result = await this.query_async('select exists ( select * from pg_tables where schemaname = $1::text and tablename = $2::text)', [p_schema, p_table]);
		let v_row = this.get_first_row(v_result);
		return v_row && v_row.exists;
	}

	async gen_uuid(p_version: string = 'v1', p_client = null) {
		let v_result = await this.query_async(`select uuid_generate_${p_version}() uuid`, null, p_client);
		let v_row = this.get_first_row(v_result);
		return v_row && v_row.uuid;
	}

	async get_db_timestamp() {
		let v_result = await this.query_async('select CURRENT_TIMESTAMP dts');
		let v_row = this.get_first_row(v_result);
		return v_row && v_row.dts;
	}
}