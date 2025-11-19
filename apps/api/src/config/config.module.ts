import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { FileConfigService } from './file-config.service';

@Module({
    imports: [NestConfigModule.forRoot()],
    providers: [FileConfigService],
    exports: [FileConfigService],
})
export class ConfigModule { }
