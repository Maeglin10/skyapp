import { Module } from '@nestjs/common';
import { ToolRegistry } from './tool.registry';
import { PluginLoaderService } from './plugin-loader.service';

@Module({
  providers: [ToolRegistry, PluginLoaderService],
  exports: [ToolRegistry, PluginLoaderService],
})
export class ToolsModule {}
