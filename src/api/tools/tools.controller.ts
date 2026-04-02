import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsArray, IsOptional } from 'class-validator';
import { ToolRegistry } from '../../core/tools/tool.registry';
import { ToolContext } from '../../core/tools/tool.types';
import { PluginLoaderService } from '../../core/tools/plugin-loader.service';

class ExecuteToolDto {
  @ApiProperty() @IsString() toolName!: string;
  @ApiProperty() @IsObject() input!: Record<string, unknown>;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() permissions?: string[];
}

@ApiTags('Tools')
@Controller('tools')
export class ToolsController {
  constructor(private toolRegistry: ToolRegistry, private pluginLoader: PluginLoaderService) {}
  @Get() @ApiOperation({ summary: 'List all available tools' }) list() { return this.toolRegistry.getAll().map(t => t.toSchema()); }
  @Post('execute') @ApiOperation({ summary: 'Execute a tool directly' }) async execute(@Body() dto: ExecuteToolDto) {
    const ctx: ToolContext = { agentId: 'api-direct', workingDir: process.cwd(), permissions: (dto.permissions ?? ['file_read', 'http_request']) as any };
    return this.toolRegistry.execute(dto.toolName, dto.input, ctx);
  }
  @Get('plugins')
  @ApiOperation({ summary: 'List loaded plugins' })
  listPlugins() { return this.pluginLoader.getLoadedPlugins(); }
}
