import { TransportType } from '../enums';

export interface BaseOptions {
  type: TransportType;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}
