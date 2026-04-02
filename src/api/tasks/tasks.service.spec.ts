import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus } from '@prisma/client';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: PrismaService;

  const mockTask = {
    id: 'task-1',
    agentId: 'agent-1',
    parentTaskId: null,
    title: 'Test Task',
    description: 'A test task',
    dependencies: [],
    status: 'PENDING' as TaskStatus,
    result: null,
    error: null,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
  };

  const mockPrismaService = {
    task: {
      create: jest.fn().mockResolvedValue(mockTask),
      findMany: jest.fn().mockResolvedValue([mockTask]),
      findUnique: jest.fn().mockResolvedValue(mockTask),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new task with required fields', async () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        description: 'Task description',
      };

      const result = await service.create(createDto);

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'New Task',
          description: 'Task description',
          dependencies: [],
          agentId: undefined,
        },
      });

      expect(result).toEqual(mockTask);
    });

    it('should create a task with agent ID', async () => {
      const createDto: CreateTaskDto = {
        title: 'Task with Agent',
        description: 'Task assigned to agent',
        agentId: 'agent-123',
      };

      await service.create(createDto);

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Task with Agent',
          description: 'Task assigned to agent',
          dependencies: [],
          agentId: 'agent-123',
        },
      });
    });

    it('should create a task with dependencies', async () => {
      const createDto: CreateTaskDto = {
        title: 'Dependent Task',
        description: 'Task with dependencies',
        dependencies: ['task-1', 'task-2'],
      };

      await service.create(createDto);

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Dependent Task',
          description: 'Task with dependencies',
          dependencies: ['task-1', 'task-2'],
          agentId: undefined,
        },
      });
    });

    it('should return the created task', async () => {
      const createDto: CreateTaskDto = {
        title: 'Test Task',
        description: 'Test description',
      };

      const result = await service.create(createDto);

      expect(result).toEqual(mockTask);
      expect(result.id).toBe('task-1');
      expect(result.title).toBe('Test Task');
    });

    it('should handle task creation errors', async () => {
      mockPrismaService.task.create.mockRejectedValueOnce(
        new Error('Database error'),
      );

      const createDto: CreateTaskDto = {
        title: 'Error Task',
        description: 'This should fail',
      };

      await expect(service.create(createDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findAll', () => {
    it('should return all tasks ordered by creation date descending', async () => {
      const result = await service.findAll();

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      expect(result).toEqual([mockTask]);
    });

    it('should limit results to 100 tasks', async () => {
      const tasks = Array.from({ length: 150 }, (_, i) => ({
        ...mockTask,
        id: `task-${i}`,
      }));

      mockPrismaService.task.findMany.mockResolvedValueOnce(
        tasks.slice(0, 100),
      );

      const result = await service.findAll();

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should return empty array when no tasks exist', async () => {
      mockPrismaService.task.findMany.mockResolvedValueOnce([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaService.task.findMany.mockRejectedValueOnce(
        new Error('Database connection failed'),
      );

      await expect(service.findAll()).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('findOne', () => {
    it('should return a task by ID', async () => {
      const result = await service.findOne('task-1');

      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 'task-1' },
      });

      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrismaService.task.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        'Task nonexistent-id not found',
      );
    });

    it('should include task ID in error message', async () => {
      mockPrismaService.task.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne('task-xyz')).rejects.toThrow(
        'Task task-xyz not found',
      );
    });

    it('should handle database errors', async () => {
      mockPrismaService.task.findUnique.mockRejectedValueOnce(
        new Error('Query failed'),
      );

      await expect(service.findOne('task-1')).rejects.toThrow(
        'Query failed',
      );
    });
  });

  describe('getStatus', () => {
    it('should return task with child tasks', async () => {
      const childTask = {
        ...mockTask,
        id: 'child-task-1',
        parentTaskId: 'task-1',
        title: 'Child Task',
      };

      mockPrismaService.task.findUnique.mockResolvedValueOnce(mockTask);
      mockPrismaService.task.findMany.mockResolvedValueOnce([childTask]);

      const result = await service.getStatus('task-1');

      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 'task-1' },
      });

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { parentTaskId: 'task-1' },
      });

      expect(result).toEqual({
        ...mockTask,
        childTasks: [childTask],
      });
    });

    it('should return empty childTasks array when no child tasks exist', async () => {
      mockPrismaService.task.findUnique.mockResolvedValueOnce(mockTask);
      mockPrismaService.task.findMany.mockResolvedValueOnce([]);

      const result = await service.getStatus('task-1');

      expect(result).toEqual({
        ...mockTask,
        childTasks: [],
      });
    });

    it('should throw NotFoundException when parent task does not exist', async () => {
      mockPrismaService.task.findUnique.mockResolvedValueOnce(null);

      await expect(service.getStatus('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include parent task data and child tasks', async () => {
      const parent = {
        ...mockTask,
        id: 'parent-task',
        status: 'RUNNING' as TaskStatus,
      };

      const children = [
        {
          ...mockTask,
          id: 'child-1',
          parentTaskId: 'parent-task',
          status: 'COMPLETED' as TaskStatus,
        },
        {
          ...mockTask,
          id: 'child-2',
          parentTaskId: 'parent-task',
          status: 'PENDING' as TaskStatus,
        },
      ];

      mockPrismaService.task.findUnique.mockResolvedValueOnce(parent);
      mockPrismaService.task.findMany.mockResolvedValueOnce(children);

      const result = await service.getStatus('parent-task');

      expect(result.id).toBe('parent-task');
      expect(result.status).toBe('RUNNING');
      expect(result.childTasks).toHaveLength(2);
      expect(result.childTasks[0].id).toBe('child-1');
      expect(result.childTasks[1].id).toBe('child-2');
    });

    it('should handle task hierarchy errors gracefully', async () => {
      mockPrismaService.task.findUnique.mockResolvedValueOnce(mockTask);
      mockPrismaService.task.findMany.mockRejectedValueOnce(
        new Error('Hierarchy query failed'),
      );

      await expect(service.getStatus('task-1')).rejects.toThrow(
        'Hierarchy query failed',
      );
    });
  });

  describe('complex scenarios', () => {
    it('should handle creating and finding tasks', async () => {
      const createDto: CreateTaskDto = {
        title: 'Complex Task',
        description: 'Complex scenario',
        dependencies: ['task-a', 'task-b'],
        agentId: 'agent-x',
      };

      const createdTask = {
        ...mockTask,
        ...createDto,
        id: 'complex-task-1',
      };

      mockPrismaService.task.create.mockResolvedValueOnce(createdTask);
      mockPrismaService.task.findUnique.mockResolvedValueOnce(createdTask);

      const result = await service.create(createDto);
      expect(result.id).toBe('complex-task-1');

      const found = await service.findOne('complex-task-1');
      expect(found.id).toBe('complex-task-1');
      expect(found.dependencies).toEqual(['task-a', 'task-b']);
    });

    it('should handle task status transitions', async () => {
      const pendingTask = { ...mockTask, status: 'PENDING' as TaskStatus };
      const runningTask = { ...mockTask, status: 'RUNNING' as TaskStatus };
      const completedTask = {
        ...mockTask,
        status: 'COMPLETED' as TaskStatus,
        completedAt: new Date(),
      };

      mockPrismaService.task.findUnique
        .mockResolvedValueOnce(pendingTask)
        .mockResolvedValueOnce(runningTask)
        .mockResolvedValueOnce(completedTask);

      const task1 = await service.findOne('task-1');
      expect(task1.status).toBe('PENDING');

      const task2 = await service.findOne('task-1');
      expect(task2.status).toBe('RUNNING');

      const task3 = await service.findOne('task-1');
      expect(task3.status).toBe('COMPLETED');
      expect(task3.completedAt).toBeDefined();
    });
  });
});
