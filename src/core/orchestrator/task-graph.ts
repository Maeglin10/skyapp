export interface TaskNode {
  id: string;
  title: string;
  description: string;
  dependencies: string[];
  agentRole: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  result?: unknown;
  error?: string;
}

export class TaskGraph {
  private nodes = new Map<string, TaskNode>();

  addTask(task: TaskNode): void { this.nodes.set(task.id, task); }

  getReadyTasks(): TaskNode[] {
    return Array.from(this.nodes.values()).filter(n => n.status === 'PENDING' && n.dependencies.every(d => this.nodes.get(d)?.status === 'COMPLETED'));
  }

  markRunning(id: string): void { const n = this.nodes.get(id); if (n) n.status = 'RUNNING'; }
  markCompleted(id: string, result: unknown): void { const n = this.nodes.get(id); if (n) { n.status = 'COMPLETED'; n.result = result; } }
  markFailed(id: string, error: string): void { const n = this.nodes.get(id); if (n) { n.status = 'FAILED'; n.error = error; } }
  isComplete(): boolean { return Array.from(this.nodes.values()).every(n => n.status === 'COMPLETED' || n.status === 'FAILED'); }
  hasFailures(): boolean { return Array.from(this.nodes.values()).some(n => n.status === 'FAILED'); }
  size(): number { return this.nodes.size; }

  getResults(): Record<string, unknown> {
    const r: Record<string, unknown> = {};
    for (const [id, n] of this.nodes) r[id] = { title: n.title, status: n.status, result: n.result, error: n.error };
    return r;
  }
}
