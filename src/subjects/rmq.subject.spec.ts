import { RmqSubject } from './rmq.subject';
import { RmqOptions } from '../interfaces';
import { TransportType } from '../enums';

// Mock amqplib to avoid requiring the actual dependency
jest.mock('amqplib', () => {
  throw new Error('amqplib not available');
});

describe('RmqSubject', () => {
  describe('constructor', () => {
    it('should throw error when amqplib is not available', () => {
      const options: RmqOptions = {
        type: TransportType.RMQ,
        urls: ['amqp://localhost:5672'],
        queue: 'test_queue',
      };

      expect(() => new RmqSubject(options)).toThrow(
        'amqplib is required for RmqSubject. Please install it: npm install amqplib',
      );
    });
  });
}); 