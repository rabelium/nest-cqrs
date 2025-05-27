import { NatsSubject } from './nats.subject';
import { NatsOptions } from '../interfaces';
import { TransportType } from '../enums';

// Mock nats to avoid requiring the actual dependency
jest.mock('nats', () => {
  throw new Error('nats not available');
});

describe('NatsSubject', () => {
  describe('constructor', () => {
    it('should throw error when nats is not available', () => {
      const options: NatsOptions = {
        type: TransportType.NATS,
        servers: ['nats://localhost:4222'],
      };

      expect(() => new NatsSubject(options)).toThrow(
        'nats is required for NatsSubject. Please install it: npm install nats',
      );
    });
  });
}); 