import fetch from 'node-fetch';

type headers_type = {
	[name: string]: string;
}

export async function http_async(p_config: any) {

	try {
		//        utils.progressUp(p_config.url);

		let v_method = 'GET';
		let v_body;
		let v_headers: headers_type = {};

		if (typeof p_config.security !== 'undefined') {
			v_headers["Authorization"] = 'Bearer ' + p_config.security.token.access_token;
		}

		if (p_config.dataIn) {
			v_method = 'POST';
			v_headers['Content-Type'] = 'application/json';
			v_body = JSON.stringify(p_config.dataIn);
		}

		let v_response = await fetch(p_config.url, {
			method: v_method,
			headers: v_headers,
			body: v_body
		});

		if (p_config.type === 'ws') {

			let v_json = await v_response.json();

			if (typeof v_json.msg === 'string') {
				//log(v_json.msg);
			}

			if (v_json.successful) {
				return v_json.data;
			} else {
				throw v_json.data || 'unknown error';
			}

		} else if (p_config.type === 'json') {

			return v_response.json();

		} else { // assume p_config.type === 'text'

			return v_response.text();
		}

	} finally {
		//       utils.progressDown(p_config.url);
	}

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