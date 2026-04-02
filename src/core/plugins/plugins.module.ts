import { Module } from '@nestjs/common';
import { PluginLoaderService } from './plugin-loader.service';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [ToolsModule],
  providers: [PluginLoaderService],
})
export class PluginsModule {}
