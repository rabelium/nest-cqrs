import { SetMetadata } from '@nestjs/common';
import { EVENT_HANDLER_METADATA } from './event-handler-metadata';

export { EVENT_HANDLER_METADATA };

export const EventHandler = (eventName: string): MethodDecorator =>
  SetMetadata(EVENT_HANDLER_METADATA, eventName);
