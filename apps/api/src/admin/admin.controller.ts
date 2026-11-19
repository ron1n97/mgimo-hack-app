import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { UpdateStudentDto } from './dto/update-student.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  @Roles(Role.ADMIN)
  overview() {
    return this.admin.overview();
  }

  /** Deanery roster: FIO / group / subgroup owned by staff, not students. */
  @Get('students')
  @Roles(Role.STAFF, Role.ADMIN)
  listStudents(@Query('q') q?: string) {
    return this.admin.listStudents(q);
  }

  @Patch('students/:id')
  @Roles(Role.STAFF, Role.ADMIN)
  updateStudent(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.admin.updateStudent(id, dto);
  }
}
