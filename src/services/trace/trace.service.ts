import { Injectable } from '@nestjs/common';

export interface TraceEvent {
  agentId: string;
  taskId?: string;
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class TraceService {
  private traces = new Map<string, TraceEvent[]>();

  record(event: Omit<TraceEvent, 'timestamp'>): void {
    const key = event.agentId;
    if (!this.traces.has(key)) this.traces.set(key, []);
    this.traces.get(key)!.push({ ...event, timestamp: new Date().toISOString() });
  }

  getTrace(agentId: string): TraceEvent[] { return this.traces.get(agentId) ?? []; }
  clearTrace(agentId: string): void { this.traces.delete(agentId); }
}
