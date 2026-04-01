import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}
  create(dto: CreateTaskDto) { return this.prisma.task.create({ data: { title: dto.title, description: dto.description, dependencies: dto.dependencies ?? [], agentId: dto.agentId } }); }
  findAll() { return this.prisma.task.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }); }
  async findOne(id: string) { const t = await this.prisma.task.findUnique({ where: { id } }); if (!t) throw new NotFoundException(`Task ${id} not found`); return t; }
  async getStatus(id: string) { const t = await this.findOne(id); const c = await this.prisma.task.findMany({ where: { parentTaskId: id } }); return { ...t, childTasks: c }; }
}
