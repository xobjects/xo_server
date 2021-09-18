import fetch from 'node-fetch';

type headers_type = {
	[name: string]: string;
}

export interface http_config {
	url: string,
	in_type?: 'json' | 'text',
	out_type?: 'json' | 'text',
	data_in?: any,
	method?: 'get' | 'post' | 'put' | 'patch' | 'delete',
	auth?: string
}

export async function http_async<T = any>(p_config: http_config | string) {

	try {
		p_config = typeof p_config === 'string' ? { url: p_config } : p_config;
		const v_in_type = p_config.in_type ?? 'json';
		let v_data_in = p_config.data_in ?? undefined;
		const v_out_type = p_config.out_type ?? 'json';
		const v_method = p_config.method ?? (v_data_in ? 'post' : 'get');
		const v_auth = p_config.auth ?? undefined;

		//        utils.progressUp(p_config.url);

		let v_body;
		let v_headers: headers_type = {};

		if (v_auth) {
			v_headers["Authorization"] = 'Bearer ' + v_auth;
		}

		if (v_data_in && v_in_type === 'json') {
			v_headers['Content-Type'] = 'application/json';
			v_data_in = JSON.stringify(v_data_in);
		}

		let v_response = await fetch(p_config.url, {
			method: v_method,
			headers: v_headers,
			body: v_data_in
		});

		const v_result = v_out_type === 'json' ? await v_response.json() : await v_response.text();
		return { status: v_response.status as number, data: v_result as T };
	}

	catch (p_error) { }
	finally { }

	return;
}


/*
example response 
{"Response":{"MetaInfo":{"Timestamp":"2020-02-09T01:01:43.457+0000"},"View":[{"_type":"SearchResultsViewType","ViewId":0,"Result":[{"Relevance":1.0,"MatchLevel":"houseNumber","MatchQuality":{"State":1.0,"City":1.0,"Street":[1.0],"HouseNumber":1.0,"PostalCode":1.0},"MatchType":"pointAddress","Location":{"LocationId":"NT_Tl6QSlU2a05IhDeLpkyD1B_yADM3A","LocationType":"point","DisplayPosition":{"Latitude":41.08676,"Longitude":-111.92823},"NavigationPosition":[{"Latitude":41.0865,"Longitude":-111.92819}],"MapView":{"TopLeft":{"Latitude":41.0878842,"Longitude":-111.9297215},"BottomRight":{"Latitude":41.0856358,"Longitude":-111.9267385}},"Address":{"Label":"2007 Forest Ridge Dr, Layton, UT 84040, United States","Country":"USA","State":"UT","County":"Davis","City":"Layton","Street":"Forest Ridge Dr","HouseNumber":"2007","PostalCode":"84040","AdditionalData":[{"value":"United States","key":"CountryName"},{"value":"Utah","key":"StateName"},{"value":"Davis","key":"CountyName"},{"value":"N","key":"PostalCodeType"}]}}}]}]}}
*/

let example_response =
{
	"Response": {
		"MetaInfo": {
			"Timestamp": "2020-02-09T01:01:43.457+0000"
		},
		"View": [
			{
				"_type": "SearchResultsViewType",
				"ViewId": 0,
				"Result": [
					{
						"Relevance": 1.0,
						"MatchLevel": "houseNumber",
						"MatchQuality": {
							"State": 1.0,
							"City": 1.0,
							"Street": [1.0],
							"HouseNumber": 1.0,
							"PostalCode": 1.0
						},
						"MatchType": "pointAddress",
						"Location": {
							"LocationId": "NT_Tl6QSlU2a05IhDeLpkyD1B_yADM3A",
							"LocationType": "point",
							"DisplayPosition": { "Latitude": 41.08676, "Longitude": -111.92823 },
							"NavigationPosition": [
								{ "Latitude": 41.0865, "Longitude": -111.92819 }
							],
							"MapView": {
								"TopLeft": { "Latitude": 41.0878842, "Longitude": -111.9297215 },
								"BottomRight": { "Latitude": 41.0856358, "Longitude": -111.9267385 }
							},
							"Address": {
								"Label": "2007 Forest Ridge Dr, Layton, UT 84040, United States",
								"Country": "USA",
								"State": "UT",
								"County": "Davis",
								"City": "Layton",
								"Street": "Forest Ridge Dr",
								"HouseNumber": "2007",
								"PostalCode": "84040",
								"AdditionalData": [
									{ "value": "United States", "key": "CountryName" },
									{ "value": "Utah", "key": "StateName" },
									{ "value": "Davis", "key": "CountyName" },
									{ "value": "N", "key": "PostalCodeType" }
								]
							}
						}
					}
				]
			}
		]
	}
}