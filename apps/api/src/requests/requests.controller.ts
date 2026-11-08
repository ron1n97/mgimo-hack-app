import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { RequestsService } from './requests.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get('requests')
  listOwn(@CurrentUser() user: JwtPayloadUser) {
    return this.requests.listOwn(user.userId);
  }

  @Post('requests')
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateRequestDto) {
    return this.requests.create(user.userId, dto);
  }

  @Get('requests/:id')
  getOne(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.requests.getById(id, user.userId, user.role);
  }

  @Get('staff/requests')
  @Roles(Role.STAFF, Role.ADMIN)
  listStaff() {
    return this.requests.listStaff();
  }

  @Patch('staff/requests/:id')
  @Roles(Role.STAFF, Role.ADMIN)
  updateStatus(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.requests.updateStatus(id, user.userId, dto);
  }
}
