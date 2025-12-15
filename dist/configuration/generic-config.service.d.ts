import { ConfigService } from '@nestjs/config';
export declare class GenericConfigService {
    private configService;
    constructor(configService: ConfigService);
    get<T = any>(path: string): T;
    getRequired<T = any>(path: string): T;
    has(path: string): boolean;
}
