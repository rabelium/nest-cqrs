import { TransportType } from '../enums';
import { BaseOptions } from './base-options.interface';
import {
  NatsAuthenticator,
  NatsReconnectDelayHandler,
  NatsNonceSigner,
  NatsTokenHandler,
  NatsTlsOptions,
} from '../external';

export interface NatsOptions extends BaseOptions {
  type: TransportType.NATS;
  headers?: Record<string, string>;
  authenticator?: NatsAuthenticator;
  debug?: boolean;
  ignoreClusterUpdates?: boolean;
  inboxPrefix?: string;
  encoding?: string;
  name?: string;
  user?: string;
  pass?: string;
  maxPingOut?: number;
  maxReconnectAttempts?: number;
  reconnectTimeWait?: number;
  reconnectJitter?: number;
  reconnectJitterTLS?: number;
  reconnectDelayHandler?: NatsReconnectDelayHandler;
  servers?: string[] | string;
  nkey?: string | Uint8Array;
  reconnect?: boolean;
  pedantic?: boolean;
  tls?: NatsTlsOptions;
  queue?: string;
  userJWT?: string;
  nonceSigner?: NatsNonceSigner;
  userCreds?: string | Uint8Array;
  useOldRequestStyle?: boolean;
  pingInterval?: number;
  preserveBuffers?: boolean;
  waitOnFirstConnect?: boolean;
  verbose?: boolean;
  noEcho?: boolean;
  noRandomize?: boolean;
  timeout?: number;
  token?: string;
  yieldTime?: number;
  tokenHandler?: NatsTokenHandler;
  gracefulShutdown?: boolean;
  gracePeriod?: number;
  [key: string]: unknown;
}
