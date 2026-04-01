import { TaskGraph } from './task-graph';

describe('TaskGraph', () => {
  let g: TaskGraph;
  beforeEach(() => {
    g = new TaskGraph();
    g.addTask({ id: 'A', title: 'A', description: 'Do A', dependencies: [], agentRole: 'WORKER', status: 'PENDING' });
    g.addTask({ id: 'B', title: 'B', description: 'Do B', dependencies: ['A'], agentRole: 'WORKER', status: 'PENDING' });
    g.addTask({ id: 'C', title: 'C', description: 'Do C', dependencies: ['A'], agentRole: 'ANALYST', status: 'PENDING' });
    g.addTask({ id: 'D', title: 'D', description: 'Do D', dependencies: ['B', 'C'], agentRole: 'WORKER', status: 'PENDING' });
  });

  it('returns only tasks with satisfied deps', () => { expect(g.getReadyTasks().map(t => t.id)).toEqual(['A']); });
  it('unlocks tasks after completion', () => { g.markCompleted('A', ''); expect(g.getReadyTasks().map(t => t.id).sort()).toEqual(['B', 'C']); });
  it('isComplete when all done', () => { ['A','B','C','D'].forEach(id => g.markCompleted(id, '')); expect(g.isComplete()).toBe(true); });
  it('detects failures', () => { g.markFailed('A', 'err'); expect(g.hasFailures()).toBe(true); });
});
