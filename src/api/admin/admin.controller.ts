import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiGovernanceService } from '../../services/ai-governance/ai-governance.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private governance: AiGovernanceService) {}
  @Get('budget') @ApiOperation({ summary: 'AI budget status' }) getBudget() { return this.governance.getStatus(); }
  @Get('stats') @ApiOperation({ summary: 'Dashboard tokens/cost/agents' }) getStats() { return this.governance.getStats(); }
  @Post('kill-switch') @ApiOperation({ summary: 'Toggle AI kill switch' }) toggle(@Body() body: { active: boolean }) { return this.governance.setKillSwitch(body.active); }
}
