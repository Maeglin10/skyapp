import { Injectable } from '@nestjs/common';
import { AgentRole } from './agent.types';

export interface FewShotExample {
  user: string;
  assistant: string;
}

@Injectable()
export class PromptLibraryService {
  private readonly examples: Record<AgentRole, FewShotExample[]> = {
    COORDINATOR: [
      {
        user: 'Build a REST API for user management',
        assistant: JSON.stringify([
          { id: '1', title: 'Design data schema', description: 'Define User model with id, email, name, createdAt fields', dependencies: [], agentRole: 'ANALYST' },
          { id: '2', title: 'Implement CRUD endpoints', description: 'Create GET /users, POST /users, GET /users/:id, PUT /users/:id, DELETE /users/:id', dependencies: ['1'], agentRole: 'WORKER' },
          { id: '3', title: 'Add validation and error handling', description: 'Add input validation, 404 handling, and proper HTTP status codes', dependencies: ['2'], agentRole: 'WORKER' },
          { id: '4', title: 'Write tests', description: 'Unit tests for each endpoint', dependencies: ['3'], agentRole: 'WORKER' },
        ]),
      },
    ],
    WORKER: [
      {
        user: 'Read the contents of config.json',
        assistant: 'I\'ll use the file_read tool to read config.json.',
      },
    ],
    ANALYST: [
      {
        user: 'Analyze the performance metrics in metrics.json',
        assistant: 'I\'ll read the file first, then provide a structured analysis.\n\n**Overview**: ...\n**Key Findings**: ...\n**Recommendations**: ...',
      },
    ],
    DEBUGGER: [
      {
        user: 'The API returns 500 on POST /users',
        assistant: 'I\'ll investigate systematically:\n1. Check recent logs\n2. Review the POST handler code\n3. Test the database connection\n\n**Root Cause**: ...\n**Fix**: ...',
      },
    ],
  };

  getFewShotExamples(role: AgentRole, count = 1): FewShotExample[] {
    return (this.examples[role] ?? []).slice(0, count);
  }

  formatAsContext(role: AgentRole): string {
    const examples = this.getFewShotExamples(role);
    if (examples.length === 0) return '';
    return '\n\nEXAMPLES:\n' + examples.map(e =>
      `User: ${e.user}\nAssistant: ${e.assistant}`
    ).join('\n\n');
  }
}
