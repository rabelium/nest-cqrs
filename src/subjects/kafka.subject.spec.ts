import { KafkaSubject } from './kafka.subject';
import { KafkaOptions } from '../interfaces';
import { TransportType } from '../enums';

// Mock kafkajs to avoid requiring the actual dependency
jest.mock('kafkajs', () => {
  throw new Error('kafkajs not available');
});

describe('KafkaSubject', () => {
  describe('constructor', () => {
    it('should throw error when kafkajs is not available', () => {
      const options: KafkaOptions = {
        type: TransportType.KAFKA,
        client: {
          clientId: 'test-client',
          brokers: ['localhost:9092'],
        },
      };

      expect(() => new KafkaSubject(options)).toThrow(
        'kafkajs is required for KafkaSubject. Please install it: npm install kafkajs',
      );
    });
  });
});
