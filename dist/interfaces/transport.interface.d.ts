export interface Transport {
    /**
     * Registers a handler for a specific event type
     * @param type The event type to listen for
     * @param handler The async handler function that processes the event payload
     */
    on<T = unknown, R = unknown>(type: string, handler: (payload: T) => Promise<R>): void;
    /**
     * Emits an event with the given type and payload
     * @param type The event type to emit
     * @param payload The payload to send with the event
     */
    emit<T = unknown>(type: string, payload: T): void;
    /**
     * Executes a command and waits for its response
     * @param type The command type to execute
     * @param payload Optional payload for the command
     * @returns Promise resolving to the command response
     * @throws Error if the command execution fails
     */
    execute<T = unknown, R = unknown>(type: string, payload?: T): Promise<R>;
}
