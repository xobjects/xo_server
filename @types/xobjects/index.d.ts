export type auth_type = {
	user: string,
	user_id: string
};

export type xobject_type = {
	xtype: string,
	xid: number,
	xname: string,
	xgeo?: any,
	[other: string]: any
};

export type ws_result_type = {
	successful: boolean,
	data?: any,
	msg?: string
};