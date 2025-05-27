import { Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { MqttOptions, Event } from '../interfaces';

type MqttType = typeof import('mqtt');
type MqttClientType = import('mqtt').MqttClient;
type IClientOptionsType = import('mqtt').IClientOptions;
let mqtt: MqttType | undefined;
try {
  mqtt = require('mqtt');
} catch (error) {
  // mqtt is optional dependency
}
const dependency_error = new Error(
  'mqtt is required for MqttSubject. Please install it: npm install mqtt',
);

export class MqttSubject extends Subject<Event> {
  private readonly logger = new Logger(MqttSubject.name);
  private mqtt_client: MqttClientType | null = null;
  private is_connected = false;
  private initialization_promise: Promise<void>;
  private readonly topic_name = 'cqrs/events';

  constructor(private readonly options: MqttOptions) {
    super();

    if (!mqtt) {
      throw dependency_error;
    }

    this.initialization_promise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      if (!mqtt) {
        throw new Error('mqtt is required for MqttSubject. Please install it: npm install mqtt');
      }

      const url = this.options.url || 'mqtt://localhost:1883';

      // Create MQTT client options with only the properties that mqtt.connect accepts
      const mqtt_client_options: IClientOptionsType = {
        port: this.options.port,
        host: this.options.host,
        hostname: this.options.hostname,
        path: this.options.path,
        protocol: this.options.protocol,
        wsOptions: this.options.wsOptions,
        keepalive: this.options.keepalive,
        clientId: this.options.clientId,
        protocolId: this.options.protocolId,
        protocolVersion: this.options.protocolVersion,
        clean: this.options.clean,
        reconnectPeriod: this.options.reconnectPeriod,
        connectTimeout: this.options.connectTimeout,
        username: this.options.username,
        password: this.options.password,
        incomingStore: this.options.incomingStore,
        outgoingStore: this.options.outgoingStore,
        queueQoSZero: this.options.queueQoSZero,
        properties: this.options.properties,
        reschedulePings: this.options.reschedulePings,
        servers: this.options.servers,
        resubscribe: this.options.resubscribe,
        will: this.options.will,
        transformWsUrl: this.options.transformWsUrl,
        key: this.options.key,
        cert: this.options.cert,
        ca: this.options.ca,
        rejectUnauthorized: this.options.rejectUnauthorized,
      } as IClientOptionsType;

      // Remove undefined properties
      Object.keys(mqtt_client_options).forEach((key: string) => {
        if (mqtt_client_options[key as keyof IClientOptionsType] === undefined) {
          delete mqtt_client_options[key as keyof IClientOptionsType];
        }
      });

      this.mqtt_client = mqtt.connect(url, mqtt_client_options);

      this.mqtt_client.on('connect', () => {
        this.is_connected = true;

        if (!this.mqtt_client) {
          throw dependency_error;
        }
        this.mqtt_client.subscribe(
          this.topic_name,
          {
            qos: this.options.subscribeOptions?.qos || 0,
            nl: this.options.subscribeOptions?.nl,
            rap: this.options.subscribeOptions?.rap,
            rh: this.options.subscribeOptions?.rh,
            properties: this.options.userProperties,
          },
          (error: Error | null) => {
            if (error) {
              this.logger.error('Failed to subscribe to MQTT topic:', error);
              super.error(error);
            }
          },
        );
      });

      this.mqtt_client.on('message', (topic: string, message: Buffer) => {
        if (topic === this.topic_name) {
          try {
            const event: Event = JSON.parse(message.toString());

            super.next(event);
          } catch (error) {
            this.logger.error('Failed to parse MQTT message:', error);
            super.error(new Error(`Failed to parse MQTT message: ${error}`));
          }
        }
      });

      this.mqtt_client.on('error', (error: Error) => {
        this.logger.error('MQTT connection error:', error);
        super.error(error);
      });

      this.mqtt_client.on('close', () => {
        this.is_connected = false;
      });

      this.mqtt_client.on('offline', () => {
        this.is_connected = false;
        this.logger.log('MQTT client is offline');
      });
    } catch (error) {
      this.logger.error('Failed to initialize MQTT subject:', error);
      super.error(error);
      throw error;
    }
  }

  next(value: Event): void {
    if (!this.is_connected) {
      this.initialization_promise
        .then(() => {
          this.publishToMqtt(value);
        })
        .catch(error => {
          super.error(error);
        });
    } else {
      this.publishToMqtt(value);
    }
  }

  private publishToMqtt(value: Event): void {
    try {
      const message = JSON.stringify(value);
      const publish_options = {
        qos: 0 as const,
        retain: false,
        dup: false,
        properties: this.options.userProperties,
      };
      if (!this.mqtt_client) {
        throw dependency_error;
      }

      this.mqtt_client.publish(this.topic_name, message, publish_options, (error?: Error) => {
        if (error) {
          this.logger.error('Failed to publish message to MQTT:', error);
          super.error(new Error(`Failed to publish to MQTT: ${error}`));
        }
      });
    } catch (error) {
      this.logger.error('Failed to publish message to MQTT:', error);
      super.error(new Error(`Failed to publish to MQTT: ${error}`));
    }
  }

  error(err: Error): void {
    const error_event: Event = {
      type: 'system_error',
      payload: err instanceof Error ? err.message : err,
    };

    if (this.is_connected) {
      this.publishToMqtt(error_event);
    }

    super.error(err);
  }

  complete(): void {
    if (this.mqtt_client) {
      this.mqtt_client.end();
    }
    super.complete();
  }

  async waitForConnection(): Promise<void> {
    await this.initialization_promise;

    return new Promise((resolve, reject) => {
      if (this.is_connected) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('MQTT connection timeout'));
      }, this.options.connectTimeout || 30000);
      if (!this.mqtt_client) {
        throw dependency_error;
      }

      this.mqtt_client.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.mqtt_client.once('error', (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  get connected(): boolean {
    return Boolean(this.is_connected && this.mqtt_client?.connected);
  }

  get client(): MqttClientType | null {
    return this.mqtt_client;
  }

  subscribeToTopic(topic: string, options?: IClientOptionsType): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.mqtt_client) {
        reject(new Error('MQTT client not initialized'));
        return;
      }

      this.mqtt_client.subscribe(topic, options || { qos: 0 }, (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  unsubscribeFromTopic(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.mqtt_client) {
        reject(new Error('MQTT client not initialized'));
        return;
      }

      this.mqtt_client.unsubscribe(topic, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  publishToTopic(
    topic: string,
    message: string | Buffer,
    options?: IClientOptionsType,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.mqtt_client) {
        reject(new Error('MQTT client not initialized'));
        return;
      }

      this.mqtt_client.publish(topic, message, options || { qos: 0 }, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}
