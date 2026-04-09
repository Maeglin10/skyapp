import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}
  @Post() @ApiOperation({ summary: 'Create a task' }) create(@Body() dto: CreateTaskDto) { return this.tasksService.create(dto); }
  @Get() @ApiOperation({ summary: 'List all tasks' }) findAll() { return this.tasksService.findAll(); }
  @Get(':id/status') @ApiOperation({ summary: 'Task status with children' }) getStatus(@Param('id') id: string) { return this.tasksService.getStatus(id); }
}
