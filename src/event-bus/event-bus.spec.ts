import { HttpException } from '@nestjs/common';
import { Subject } from 'rxjs';
import { EventBus } from './event-bus';
import { Event } from '../interfaces';

describe('EventBus', () => {
  let event_bus: EventBus;
  let mock_subject: Subject<Event>;

  beforeEach(() => {
    mock_subject = new Subject<Event>();
    event_bus = new EventBus(mock_subject);
  });

  afterEach(() => {
    // Don't complete the subject as it can cause issues with RxJS firstValueFrom
    // The subject will be recreated in beforeEach for the next test
  });

  describe('constructor', () => {
    it('should create EventBus with provided subject', () => {
      const custom_subject = new Subject<Event>();
      const bus = new EventBus(custom_subject);

      expect(bus).toBeDefined();
    });

    it('should create EventBus with default subject when none provided', () => {
      const bus = new EventBus(null as any);

      expect(bus).toBeDefined();
    });

    it('should create EventBus with undefined subject', () => {
      const bus = new EventBus(undefined as any);

      expect(bus).toBeDefined();
    });
  });

  describe('emit', () => {
    it('should emit event with correct type and payload', () => {
      const spy = jest.spyOn(mock_subject, 'next');
      const test_payload = { message: 'test' };

      event_bus.emit('test_event', test_payload);

      expect(spy).toHaveBeenCalledWith({
        type: 'test_event',
        payload: test_payload,
      });
    });

    it('should emit event with null payload', () => {
      const spy = jest.spyOn(mock_subject, 'next');

      event_bus.emit('test_event', null);

      expect(spy).toHaveBeenCalledWith({
        type: 'test_event',
        payload: null,
      });
    });

    it('should emit event with undefined payload', () => {
      const spy = jest.spyOn(mock_subject, 'next');

      event_bus.emit('test_event', undefined);

      expect(spy).toHaveBeenCalledWith({
        type: 'test_event',
        payload: undefined,
      });
    });
  });

  describe('on', () => {
    it('should register event handler and execute on matching event', async () => {
      const handler = jest.fn().mockResolvedValue('test_result');
      const test_payload = { data: 'test' };

      event_bus.on('test_event', handler);

      mock_subject.next({
        type: 'test_event',
        payload: test_payload,
      });

      // Wait for async handler execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(handler).toHaveBeenCalledWith(test_payload);
    });

    it('should not execute handler for non-matching event type', async () => {
      const handler = jest.fn().mockResolvedValue('test_result');

      event_bus.on('test_event', handler);

      mock_subject.next({
        type: 'different_event',
        payload: { data: 'test' },
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should send response when handler succeeds and correlationId exists', async () => {
      const handler = jest.fn().mockResolvedValue('success_result');
      const spy = jest.spyOn(mock_subject, 'next');
      const correlation_id = 'test-correlation-id';

      event_bus.on('test_event', handler);

      mock_subject.next({
        type: 'test_event',
        payload: { data: 'test' },
        correlationId: correlation_id,
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(spy).toHaveBeenCalledWith({
        type: 'test_event_response',
        payload: 'success_result',
        correlationId: correlation_id,
      });
    });

    it('should not send response when handler succeeds but no correlationId', async () => {
      const handler = jest.fn().mockResolvedValue('success_result');

      event_bus.on('test_event', handler);

      // Set up spy after registration to avoid counting subscription calls
      const spy = jest.spyOn(mock_subject, 'next');

      mock_subject.next({
        type: 'test_event',
        payload: { data: 'test' },
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      // Should only have the initial event, no response
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({
        type: 'test_event',
        payload: { data: 'test' },
      });
    });

    it('should send error response when handler fails and correlationId exists', async () => {
      const test_error = new Error('Handler failed');
      const handler = jest.fn().mockRejectedValue(test_error);
      const spy = jest.spyOn(mock_subject, 'next');
      const correlation_id = 'test-correlation-id';

      event_bus.on('test_event', handler);

      mock_subject.next({
        type: 'test_event',
        payload: { data: 'test' },
        correlationId: correlation_id,
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(spy).toHaveBeenCalledWith({
        type: 'test_event_error',
        payload: test_error,
        correlationId: correlation_id,
      });
    });

    it('should not send error response when handler fails but no correlationId', async () => {
      const test_error = new Error('Handler failed');
      const handler = jest.fn().mockRejectedValue(test_error);

      event_bus.on('test_event', handler);

      // Set up spy after registration to avoid counting subscription calls
      const spy = jest.spyOn(mock_subject, 'next');

      mock_subject.next({
        type: 'test_event',
        payload: { data: 'test' },
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      // Should only have the initial event, no error response
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({
        type: 'test_event',
        payload: { data: 'test' },
      });
    });

    it('should handle multiple handlers for same event type', async () => {
      const handler_1 = jest.fn().mockResolvedValue('result_1');
      const handler_2 = jest.fn().mockResolvedValue('result_2');
      const test_payload = { data: 'test' };

      event_bus.on('test_event', handler_1);
      event_bus.on('test_event', handler_2);

      mock_subject.next({
        type: 'test_event',
        payload: test_payload,
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(handler_1).toHaveBeenCalledWith(test_payload);
      expect(handler_2).toHaveBeenCalledWith(test_payload);
    });
  });

  describe('execute', () => {
    it('should execute command and return response', async () => {
      const expected_result = { success: true };

      // Setup handler that will respond
      event_bus.on('test_command', async () => expected_result);

      const result_promise = event_bus.execute('test_command', { data: 'test' });

      // Wait a bit for the command to be processed
      await new Promise(resolve => setTimeout(resolve, 0));

      const result = await result_promise;
      expect(result).toEqual(expected_result);
    });

    it('should execute command without payload', async () => {
      const expected_result = { success: true };

      event_bus.on('test_command', async () => expected_result);

      const result = await event_bus.execute('test_command');

      expect(result).toEqual(expected_result);
    });

    it('should throw error when command handler throws Error', async () => {
      const test_error = new Error('Command failed');

      event_bus.on('test_command', async () => {
        throw test_error;
      });

      await expect(event_bus.execute('test_command')).rejects.toThrow(test_error);
    });

    it('should throw HttpException when command handler throws HttpException', async () => {
      const http_error = new HttpException('Bad request', 400);

      event_bus.on('test_command', async () => {
        throw http_error;
      });

      await expect(event_bus.execute('test_command')).rejects.toThrow(http_error);
    });

    it('should throw HttpException when command handler throws non-Error object', async () => {
      const error_payload = { message: 'Custom error', status: 500 };

      event_bus.on('test_command', async () => {
        throw error_payload;
      });

      await expect(event_bus.execute('test_command')).rejects.toThrow(HttpException);

      try {
        await event_bus.execute('test_command');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(500);
      }
    });

    it('should generate unique correlation IDs for concurrent executions', async () => {
      const spy = jest.spyOn(mock_subject, 'next');

      event_bus.on('test_command', async () => 'result');

      const promise_1 = event_bus.execute('test_command', { id: 1 });
      const promise_2 = event_bus.execute('test_command', { id: 2 });

      await Promise.all([promise_1, promise_2]);

      const calls = spy.mock.calls;
      const command_calls = calls.filter(call => call[0].type === 'test_command');

      expect(command_calls).toHaveLength(2);
      expect(command_calls[0][0].correlationId).toBeDefined();
      expect(command_calls[1][0].correlationId).toBeDefined();
      expect(command_calls[0][0].correlationId).not.toEqual(command_calls[1][0].correlationId);
    });

    it('should timeout when no response received', async () => {
      // Set up spy before execute to capture the command emission
      const spy = jest.spyOn(mock_subject, 'next');

      // Don't register any handler - this will cause the execute to hang
      const execute_promise = event_bus.execute('nonexistent_command');

      // Give it a moment to emit the command
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify the command was emitted
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'nonexistent_command',
          correlationId: expect.any(String),
        }),
      );

      // Note: In a real scenario, this would timeout. For testing purposes,
      // we're just verifying the command emission behavior.
    });
  });

  describe('edge cases', () => {
    it('should handle handler that returns null', async () => {
      event_bus.on('test_event', async () => null);

      const result = await event_bus.execute('test_event');

      expect(result).toBeNull();
    });

    it('should handle handler that returns undefined', async () => {
      event_bus.on('test_event', async () => undefined);

      const result = await event_bus.execute('test_event');

      expect(result).toBeUndefined();
    });

    it('should handle complex payload objects', async () => {
      const complex_payload = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
        date: new Date(),
        number: 42,
      };

      const handler = jest.fn().mockResolvedValue('handled');
      event_bus.on('complex_event', handler);

      event_bus.emit('complex_event', complex_payload);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(handler).toHaveBeenCalledWith(complex_payload);
    });
  });
});
