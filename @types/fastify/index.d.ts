import { RequestGenericInterface, RawServerBase, RawServerDefault, RawRequestDefaultExpression } from 'fastify';
import { RouteGenericInterface } from 'fastify/types/route';

import { Server, ServerResponse, IncomingMessage } from 'http';
import { auth_type } from '../xobjects';

declare module 'fastify' {

    export interface FastifyRequest<
        RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
        RawServer extends RawServerBase = RawServerDefault,
        RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>> {
        //
        auth: auth_type
    }

}