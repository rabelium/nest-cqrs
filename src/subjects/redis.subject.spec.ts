import { RedisSubject } from './redis.subject';
import { RedisOptions } from '../interfaces';
import { TransportType } from '../enums';

// Mock ioredis to avoid requiring the actual dependency
jest.mock('ioredis', () => {
  throw new Error('ioredis not available');
});

describe('RedisSubject', () => {
  describe('constructor', () => {
    it('should throw error when ioredis is not available', () => {
      const options: RedisOptions = {
        type: TransportType.REDIS,
        host: 'localhost',
        port: 6379,
      };

      expect(() => new RedisSubject(options)).toThrow(
        'ioredis is required for RedisSubject. Please install it: npm install ioredis',
      );
    });
  });
});
