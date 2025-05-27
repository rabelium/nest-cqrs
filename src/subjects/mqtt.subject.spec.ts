import { MqttSubject } from './mqtt.subject';
import { MqttOptions } from '../interfaces';
import { TransportType } from '../enums';

// Mock mqtt to avoid requiring the actual dependency
jest.mock('mqtt', () => {
  throw new Error('mqtt not available');
});

describe('MqttSubject', () => {
  describe('constructor', () => {
    it('should throw error when mqtt is not available', () => {
      const options: MqttOptions = {
        type: TransportType.MQTT,
        url: 'mqtt://localhost:1883',
      };

      expect(() => new MqttSubject(options)).toThrow(
        'mqtt is required for MqttSubject. Please install it: npm install mqtt',
      );
    });
  });
}); 