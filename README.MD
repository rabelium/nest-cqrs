# @rabelium/cqrs

A flexible NestJS CQRS (Command Query Responsibility Segregation) library that provides event-driven architecture with support for multiple transport layers.

## Overview

This library implements the CQRS pattern with a focus on:
- **Event-driven architecture** with pub/sub messaging
- **Multiple transport layers** (Redis, NATS, MQTT, RabbitMQ, Kafka)
- **Request-response patterns** with correlation IDs
- **Automatic event handler discovery** through decorators
- **Type-safe interfaces** for events and handlers

## Features

- 🚀 **Multiple Transport Support**: Choose from Redis, NATS, MQTT, RabbitMQ, Kafka, or local event emitter
- 🎯 **Event Handler Discovery**: Automatic registration of event handlers using decorators
- 🔄 **Request-Response Pattern**: Execute commands and wait for responses with correlation IDs
- 📡 **Pub/Sub Messaging**: Fire-and-forget event publishing
- 🛡️ **Type Safety**: Full TypeScript support with generic interfaces
- ⚡ **Performance**: Efficient RxJS-based event streaming
- 🔧 **Flexible Configuration**: Easy transport configuration and optional dependencies

## Installation

```bash
npm install @rabelium/cqrs
```

### Optional Transport Dependencies

Install transport-specific packages as needed:

```bash
# Redis
npm install ioredis

# NATS
npm install nats

# MQTT
npm install mqtt

# RabbitMQ
npm install amqplib

# Kafka
npm install kafkajs
```

## Quick Start

### 1. Import the Module

```typescript
import { CqrsModule } from '@rabelium/cqrs';

@Module({
  imports: [
    // Default in-memory event emitter
    CqrsModule.forRoot(),
    
    // Or with Redis transport
    CqrsModule.forRoot({
      transport: {
        type: 'redis',
        host: 'localhost',
        port: 6379
      }
    })
  ]
})
export class AppModule {}
```

### 2. Create Event Handlers

```typescript
import { Injectable } from '@nestjs/common';
import { EventHandler } from '@rabelium/cqrs';

@Injectable()
export class UserService {
  @EventHandler('user.created')
  async handleUserCreated(payload: { id: string; email: string }) {
    console.log('User created:', payload);
    // Process the event
  }

  @EventHandler('user.get')
  async getUser(payload: { id: string }) {
    // This handler can return data for execute() calls
    return { id: payload.id, name: 'John Doe', email: 'john@example.com' };
  }
}
```

### 3. Publish Events and Execute Commands

```typescript
import { Injectable } from '@nestjs/common';
import { EventBus } from '@rabelium/cqrs';

@Injectable()
export class UserController {
  constructor(private readonly eventBus: EventBus) {}

  async createUser(userData: any) {
    // Fire-and-forget event
    this.eventBus.emit('user.created', { id: '123', email: 'user@example.com' });
  }

  async getUser(id: string) {
    // Request-response pattern
    const user = await this.eventBus.execute('user.get', { id });
    return user;
  }
}
```

## Transport Configuration

### Redis
```typescript
CqrsModule.forRoot({
  transport: {
    type: 'redis',
    host: 'localhost',
    port: 6379,
    retryDelay: 100,
    retryAttempts: 3,
    timeout: 10000
  }
})
```

### NATS
```typescript
CqrsModule.forRoot({
  transport: {
    type: 'nats',
    servers: ['nats://localhost:4222'],
    reconnect: true,
    maxReconnectAttempts: 10
  }
})
```

### MQTT
```typescript
CqrsModule.forRoot({
  transport: {
    type: 'mqtt',
    hostname: 'localhost',
    port: 1883,
    clientId: 'cqrs-client',
    clean: true
  }
})
```

### RabbitMQ
```typescript
CqrsModule.forRoot({
  transport: {
    type: 'rabbitmq',
    hostname: 'localhost',
    port: 5672,
    username: 'guest',
    password: 'guest',
    vhost: '/'
  }
})
```

### Kafka
```typescript
CqrsModule.forRoot({
  transport: {
    type: 'kafka',
    clientId: 'cqrs-client',
    brokers: ['localhost:9092'],
    groupId: 'cqrs-group'
  }
})
```

## API Reference

### EventBus

#### Methods

- **`emit<T>(type: string, payload: T): void`**
  - Publishes an event without waiting for a response
  - Use for fire-and-forget messaging

- **`execute<T, R>(type: string, payload?: T): Promise<R>`**
  - Executes a command and waits for a response
  - Uses correlation IDs for request-response matching
  - Throws errors if command fails

- **`on<T, R>(type: string, handler: (payload: T) => Promise<R>): void`**
  - Manually registers an event handler (alternative to decorator)

### Decorators

- **`@EventHandler(eventName: string)`**
  - Marks a method as an event handler
  - Automatically discovered and registered on application bootstrap

### Interfaces

```typescript
interface Event<T = any> {
  type: string;
  payload: T;
  correlationId?: string;
}

interface Transport {
  on<T, R>(type: string, handler: (payload: T) => Promise<R>): void;
  emit<T>(type: string, payload: T): void;
  execute<T, R>(type: string, payload?: T): Promise<R>;
}
```

## Error Handling

The library automatically handles errors in event handlers:

```typescript
@EventHandler('risky.operation')
async handleRiskyOperation(payload: any) {
  throw new Error('Something went wrong');
  // Error will be caught and sent as response for execute() calls
  // For emit() calls, errors are logged but don't affect other handlers
}
```

## Best Practices

1. **Use descriptive event names** with namespacing (e.g., `user.created`, `order.shipped`)
2. **Keep event handlers idempotent** to handle duplicate messages
3. **Use emit() for notifications** and execute() for commands requiring responses
4. **Handle errors gracefully** in event handlers
5. **Use correlation IDs** for tracing in distributed systems

## Examples

### Microservice Communication

```typescript
// Service A - Order Service
@Injectable()
export class OrderService {
  async createOrder(orderData: any) {
    // Create order logic
    const order = await this.saveOrder(orderData);
    
    // Notify other services
    this.eventBus.emit('order.created', {
      orderId: order.id,
      userId: order.userId,
      total: order.total
    });
  }
}

// Service B - Inventory Service
@Injectable()
export class InventoryService {
  @EventHandler('order.created')
  async handleOrderCreated(payload: { orderId: string; userId: string }) {
    // Update inventory
    await this.updateInventory(payload.orderId);
  }
}

// Service C - Notification Service
@Injectable()
export class NotificationService {
  @EventHandler('order.created')
  async handleOrderCreated(payload: { orderId: string; userId: string }) {
    // Send notification
    await this.sendOrderConfirmation(payload.userId, payload.orderId);
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT
