/**
 * Module dependencies.
 */

//var pg = require('pg-promise')(process.env.DATABASE_URL);

/*
 * Get access token.
 */

export function getAccessToken(bearerToken) {
	debugger;
	/*
	return pg.query('SELECT access_token, access_token_expires_on, client_xid, refresh_token, refresh_token_expires_on, user_xid FROM oauth_tokens WHERE access_token = $1', [bearerToken])
		.then(function (result) {
			var token = result.rows[0];

			return {
				accessToken: token.access_token,
				client: { id: token.client_xid },
				expires: token.expires,
				user: { id: token.userId }, // could be any object
			};
		});
		*/
};

/**
 * Get client.
 */

export function* getClient(clientId, clientSecret) {
	debugger;
	/*
	return pg.query('SELECT client_xid, client_secret, redirect_uri FROM oauth_clients WHERE client_xid = $1 AND client_secret = $2', [clientId, clientSecret])
		.then(function (result) {
			var oAuthClient = result.rows[0];

			if (!oAuthClient) {
				return;
			}

			return {
				clientId: oAuthClient.client_xid,
				clientSecret: oAuthClient.client_secret,
				grants: ['password'], // the list of OAuth2 grant types that should be allowed
			};
		});
		*/
};

/**
 * Get refresh token.
 */

export function* getRefreshToken(bearerToken) {
	debugger;
	/*
	return pg.query('SELECT access_token, access_token_expires_on, client_xid, refresh_token, refresh_token_expires_on, user_xid FROM oauth_tokens WHERE refresh_token = $1', [bearerToken])
		.then(function (result) {
			return result.rowCount ? result.rows[0] : false;
		});
		*/
};

/*
 * Get user.
 */

export function* getUser(username, password) {
	debugger;
	/*
	return pg.query('SELECT id FROM users WHERE username = $1 AND password = $2', [username, password])
		.then(function (result) {
			return result.rowCount ? result.rows[0] : false;
		});
		*/
};

/**
 * Save token.
 */

export function* saveAccessToken(token, client, user) {
	debugger;
	/*
		return pg.query('INSERT INTO oauth_tokens(access_token, access_token_expires_on, client_xid, refresh_token, refresh_token_expires_on, user_xid) VALUES ($1, $2, $3, $4)', [
			token.accessToken,
			token.accessTokenExpiresOn,
			client.id,
			token.refreshToken,
			token.refreshTokenExpiresOn,
			user.id
		]).then(function (result) {
			return result.rowCount ? result.rows[0] : false; // TODO return object with client: {id: clientId} and user: {id: userId} defined
		});
	*/
};