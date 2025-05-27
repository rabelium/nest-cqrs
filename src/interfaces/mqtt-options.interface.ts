import { TransportType } from '../enums';
import { BaseOptions } from './base-options.interface';
import { MqttClientOptions, QoS } from '../external';

export interface MqttOptions extends BaseOptions, MqttClientOptions {
  type: TransportType.MQTT;
  url?: string;
  subscribeOptions?: {
    /**
     * The QoS
     */
    qos: QoS;
    /*
     * No local flag
     * */
    nl?: boolean;
    /*
     * Retain as Published flag
     * */
    rap?: boolean;
    /*
     * Retain Handling option
     * */
    rh?: number;
  };
  userProperties?: Record<string, string | string[]>;
}
