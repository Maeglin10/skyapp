import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiGovernanceService } from '../../services/ai-governance/ai-governance.service';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private governance: AiGovernanceService) {}
  @Get('budget') @ApiOperation({ summary: 'AI budget status' }) getBudget() { return this.governance.getStatus(); }
  @Post('kill-switch') @ApiOperation({ summary: 'Toggle AI kill switch' }) toggle(@Body() body: { active: boolean }) { return this.governance.setKillSwitch(body.active); }
}
