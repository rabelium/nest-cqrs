"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MqttSubject = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
let mqtt;
try {
    mqtt = require('mqtt');
}
catch (error) {
    // mqtt is optional dependency
}
const dependency_error = new Error('mqtt is required for MqttSubject. Please install it: npm install mqtt');
class MqttSubject extends rxjs_1.Subject {
    constructor(options) {
        super();
        this.options = options;
        this.logger = new common_1.Logger(MqttSubject.name);
        this.mqtt_client = null;
        this.is_connected = false;
        this.topic_name = 'cqrs/events';
        if (!mqtt) {
            throw dependency_error;
        }
        this.initialization_promise = this.initialize();
    }
    async initialize() {
        try {
            if (!mqtt) {
                throw new Error('mqtt is required for MqttSubject. Please install it: npm install mqtt');
            }
            const url = this.options.url || 'mqtt://localhost:1883';
            // Create MQTT client options with only the properties that mqtt.connect accepts
            const mqtt_client_options = {
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
            };
            // Remove undefined properties
            Object.keys(mqtt_client_options).forEach((key) => {
                if (mqtt_client_options[key] === undefined) {
                    delete mqtt_client_options[key];
                }
            });
            this.mqtt_client = mqtt.connect(url, mqtt_client_options);
            this.mqtt_client.on('connect', () => {
                this.is_connected = true;
                if (!this.mqtt_client) {
                    throw dependency_error;
                }
                this.mqtt_client.subscribe(this.topic_name, {
                    qos: this.options.subscribeOptions?.qos || 0,
                    nl: this.options.subscribeOptions?.nl,
                    rap: this.options.subscribeOptions?.rap,
                    rh: this.options.subscribeOptions?.rh,
                    properties: this.options.userProperties,
                }, (error) => {
                    if (error) {
                        this.logger.error('Failed to subscribe to MQTT topic:', error);
                        super.error(error);
                    }
                });
            });
            this.mqtt_client.on('message', (topic, message) => {
                if (topic === this.topic_name) {
                    try {
                        const event = JSON.parse(message.toString());
                        super.next(event);
                    }
                    catch (error) {
                        this.logger.error('Failed to parse MQTT message:', error);
                        super.error(new Error(`Failed to parse MQTT message: ${error}`));
                    }
                }
            });
            this.mqtt_client.on('error', (error) => {
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
        }
        catch (error) {
            this.logger.error('Failed to initialize MQTT subject:', error);
            super.error(error);
            throw error;
        }
    }
    next(value) {
        if (!this.is_connected) {
            this.initialization_promise
                .then(() => {
                this.publishToMqtt(value);
            })
                .catch(error => {
                super.error(error);
            });
        }
        else {
            this.publishToMqtt(value);
        }
    }
    publishToMqtt(value) {
        try {
            const message = JSON.stringify(value);
            const publish_options = {
                qos: 0,
                retain: false,
                dup: false,
                properties: this.options.userProperties,
            };
            if (!this.mqtt_client) {
                throw dependency_error;
            }
            this.mqtt_client.publish(this.topic_name, message, publish_options, (error) => {
                if (error) {
                    this.logger.error('Failed to publish message to MQTT:', error);
                    super.error(new Error(`Failed to publish to MQTT: ${error}`));
                }
            });
        }
        catch (error) {
            this.logger.error('Failed to publish message to MQTT:', error);
            super.error(new Error(`Failed to publish to MQTT: ${error}`));
        }
    }
    error(err) {
        const error_event = {
            type: 'system_error',
            payload: err instanceof Error ? err.message : err,
        };
        if (this.is_connected) {
            this.publishToMqtt(error_event);
        }
        super.error(err);
    }
    complete() {
        if (this.mqtt_client) {
            this.mqtt_client.end();
        }
        super.complete();
    }
    async waitForConnection() {
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
            this.mqtt_client.once('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }
    get connected() {
        return Boolean(this.is_connected && this.mqtt_client?.connected);
    }
    get client() {
        return this.mqtt_client;
    }
    subscribeToTopic(topic, options) {
        return new Promise((resolve, reject) => {
            if (!this.mqtt_client) {
                reject(new Error('MQTT client not initialized'));
                return;
            }
            this.mqtt_client.subscribe(topic, options || { qos: 0 }, (error) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    }
    unsubscribeFromTopic(topic) {
        return new Promise((resolve, reject) => {
            if (!this.mqtt_client) {
                reject(new Error('MQTT client not initialized'));
                return;
            }
            this.mqtt_client.unsubscribe(topic, (error) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    }
    publishToTopic(topic, message, options) {
        return new Promise((resolve, reject) => {
            if (!this.mqtt_client) {
                reject(new Error('MQTT client not initialized'));
                return;
            }
            this.mqtt_client.publish(topic, message, options || { qos: 0 }, (error) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    }
}
exports.MqttSubject = MqttSubject;
