export type auth_type = {
	user: string,
	user_xid: string
};

export type xobject = {
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