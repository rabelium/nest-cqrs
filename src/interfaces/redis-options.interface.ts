import { TransportType } from '../enums';
import { BaseOptions } from './base-options.interface';
import { IORedisOptions } from '../external';

export interface RedisOptions extends BaseOptions, IORedisOptions {
  type: TransportType.REDIS;
  host?: string;
  port?: number;
}
