import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { CreateLessonTaskDto } from './dto/create-lesson-task.dto';
import { UpdateLessonTaskDto } from './dto/update-lesson-task.dto';
import { TeacherAssignmentsService } from './teacher-assignments.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeacherAssignmentsController {
  constructor(private readonly service: TeacherAssignmentsService) {}

  // ── Staff / dean orchestration ──────────────────────────────────

  @Get('staff/teachers')
  @Roles(Role.STAFF, Role.ADMIN)
  listTeachers() {
    return this.service.listTeachers();
  }

  @Get('staff/teacher-assignments')
  @Roles(Role.STAFF, Role.ADMIN)
  listAssignments() {
    return this.service.listAssignments();
  }

  @Post('staff/teacher-assignments')
  @Roles(Role.STAFF, Role.ADMIN)
  assign(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: AssignTeacherDto,
  ) {
    return this.service.assignTeacher(user.userId, dto);
  }

  @Delete('staff/teacher-assignments/:id')
  @Roles(Role.STAFF, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.removeAssignment(id);
  }

  // ── Teacher cabinet ─────────────────────────────────────────────

  @Get('teacher/slots')
  @Roles(Role.TEACHER)
  mySlots(
    @CurrentUser() user: JwtPayloadUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.listMySlots(user.userId, from, to);
  }

  @Get('teacher/tasks')
  @Roles(Role.TEACHER)
  myTasks(@CurrentUser() user: JwtPayloadUser) {
    return this.service.listMyTasks(user.userId);
  }

  @Post('teacher/tasks')
  @Roles(Role.TEACHER)
  createTask(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateLessonTaskDto,
  ) {
    return this.service.createTask(user.userId, user.role, dto);
  }

  @Patch('teacher/tasks/:id')
  @Roles(Role.TEACHER)
  updateTask(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateLessonTaskDto,
  ) {
    return this.service.updateTask(id, user.userId, user.role, dto);
  }

  @Delete('teacher/tasks/:id')
  @Roles(Role.TEACHER)
  deleteTask(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.service.deleteTask(id, user.userId, user.role);
  }

  // ── Student visibility ──────────────────────────────────────────

  @Get('tasks/me')
  @Roles(Role.STUDENT)
  studentTasks(@CurrentUser() user: JwtPayloadUser) {
    return this.service.listStudentTasks(user.userId, false);
  }

  @Get('tasks/today')
  @Roles(Role.STUDENT)
  studentTasksToday(@CurrentUser() user: JwtPayloadUser) {
    return this.service.listStudentTasks(user.userId, true);
  }
}
