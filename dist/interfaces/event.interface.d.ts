export interface Event<T = unknown> {
    type: string;
    payload: T;
    correlationId?: string;
}
