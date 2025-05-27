"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransportType = void 0;
var TransportType;
(function (TransportType) {
    TransportType["REDIS"] = "redis";
    TransportType["NATS"] = "nats";
    TransportType["MQTT"] = "mqtt";
    TransportType["RMQ"] = "rabbitmq";
    TransportType["KAFKA"] = "kafka";
})(TransportType || (exports.TransportType = TransportType = {}));
