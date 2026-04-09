import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  remainingBudget?: number;
}

@Injectable()
export class AiGovernanceService {
  private readonly logger = new Logger(AiGovernanceService.name);

  constructor(private prisma: PrismaService) {}

  async checkBudget(estimatedCostUsd = 0): Promise<BudgetCheckResult> {
    let budget = await this.prisma.aiBudget.findFirst({ where: { name: 'default' } });
    if (!budget) {
      budget = await this.prisma.aiBudget.create({ data: { name: 'default', monthlyLimitUsd: parseFloat(process.env.AI_BUDGET_DEFAULT_MONTHLY_USD ?? '50'), alertThreshold: parseFloat(process.env.AI_BUDGET_ALERT_THRESHOLD ?? '0.8'), killSwitch: false, currentMonthSpend: 0, currentDaySpend: 0, resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1) } });
    }
    if (budget.killSwitch) return { allowed: false, reason: 'AI kill switch is active' };
    if (budget.currentMonthSpend + estimatedCostUsd > budget.monthlyLimitUsd) return { allowed: false, reason: `Monthly budget exceeded` };
    if (budget.currentMonthSpend > budget.monthlyLimitUsd * budget.alertThreshold) this.logger.warn(`AI budget alert: ${((budget.currentMonthSpend / budget.monthlyLimitUsd) * 100).toFixed(1)}% used`);
    return { allowed: true, remainingBudget: budget.monthlyLimitUsd - budget.currentMonthSpend - estimatedCostUsd };
  }

  async recordSpend(costUsd: number): Promise<void> {
    await this.prisma.aiBudget.updateMany({ where: { name: 'default' }, data: { currentMonthSpend: { increment: costUsd }, currentDaySpend: { increment: costUsd } } });
  }

  async setKillSwitch(active: boolean): Promise<void> {
    await this.prisma.aiBudget.updateMany({ where: { name: 'default' }, data: { killSwitch: active } });
    this.logger.warn(`AI kill switch ${active ? 'ACTIVATED' : 'deactivated'}`);
  }

  async getStatus() { return this.prisma.aiBudget.findFirst({ where: { name: 'default' } }); }

  async getStats() {
    const agentsCount = await this.prisma.agent.count();
    const logs = await this.prisma.aiUsageLog.aggregate({
      _sum: { inputTokens: true, outputTokens: true, costUsd: true }
    });
    return {
      agents: agentsCount,
      totalTokens: (logs._sum.inputTokens || 0) + (logs._sum.outputTokens || 0),
      totalCostUsd: logs._sum.costUsd || 0
    };
  }
}
