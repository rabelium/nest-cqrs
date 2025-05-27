/**
 * @see https://github.com/nats-io/nats.js
 *
 * @publicApi
 */
export interface NatsCodec<T> {
    encode(d: T): Uint8Array;
    decode(a: Uint8Array): T;
}
export interface NatsAuthenticator {
    (nonce?: string): string;
}
export interface NatsReconnectDelayHandler {
    (): number;
}
export interface NatsNonceSigner {
    (nonce: string): string;
}
export interface NatsTokenHandler {
    (): string;
}
export interface NatsTlsOptions {
    cert?: string | Buffer;
    key?: string | Buffer;
    ca?: string | Buffer;
    rejectUnauthorized?: boolean;
}
