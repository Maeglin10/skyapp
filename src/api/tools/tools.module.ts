import { Module } from '@nestjs/common';
import { ToolsController } from './tools.controller';
import { ToolsModule } from '../../core/tools/tools.module';

@Module({ imports: [ToolsModule], controllers: [ToolsController] })
export class ToolsApiModule {}
