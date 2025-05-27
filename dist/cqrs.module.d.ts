import { DynamicModule } from '@nestjs/common';
import { TransportConfig } from './interfaces';
export interface CqrsModuleOptions {
    transport?: TransportConfig;
}
export declare class CqrsModule {
    static forRoot(configuration?: CqrsModuleOptions): DynamicModule;
}
