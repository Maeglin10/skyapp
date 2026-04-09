import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { AgentsService } from './agents.service';
import { LLMService } from '../../core/llm/llm.service';
import { TraceService } from '../../services/trace/trace.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RunAgentDto } from './dto/run-agent.dto';
import { LLMProviderKey } from '../../core/agent/agent.types';

@ApiTags('Agents')
@ApiBearerAuth()
@Controller('agents')
export class AgentsController {
  constructor(private agentsService: AgentsService, private llm: LLMService, private trace: TraceService, private prisma: PrismaService) {}

  @Post('run') @ApiOperation({ summary: 'Run a single agent on a task' })
  run(@Body() dto: RunAgentDto) { return this.agentsService.run(dto); }

  @Post('orchestrate') @ApiOperation({ summary: 'Orchestrate a complex objective with task DAG' })
  orchestrate(@Body() dto: RunAgentDto) { return this.agentsService.orchestrate(dto); }



  @Get(':id/status') @ApiOperation({ summary: 'Agent execution status' })
  async getStatus(@Param('id') id: string) {
    const steps = await this.prisma.agentStep.findMany({ where: { agentId: id }, orderBy: { createdAt: 'asc' } });
    const logs = await this.prisma.aiUsageLog.findMany({ where: { agentId: id } });
    return { agentId: id, steps, totalTokens: logs.reduce((s, l) => s + l.inputTokens + l.outputTokens, 0), totalCostUsd: logs.reduce((s, l) => s + l.costUsd, 0) };
  }

  @Get(':id/trace') @ApiOperation({ summary: 'Execution trace for an agent' })
  getTrace(@Param('id') id: string) { return this.trace.getTrace(id); }
}
