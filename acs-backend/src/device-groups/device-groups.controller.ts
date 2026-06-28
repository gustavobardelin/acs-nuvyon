import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ApplyTemplateToGroupDto } from './dto/apply-template-to-group.dto';
import { CreateDeviceGroupDto } from './dto/create-device-group.dto';
import { UpdateDeviceGroupDto } from './dto/update-device-group.dto';
import { DeviceGroupsService } from './device-groups.service';

@Controller('device-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeviceGroupsController {
  constructor(private readonly groupsService: DeviceGroupsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async list(@Query('includeInactive') includeInactive?: string) {
    return this.groupsService.findAll(includeInactive !== 'false');
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async get(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Get(':id/devices')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async previewDevices(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.groupsService.previewDevices(id, Number(limit || 100));
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async create(@Body() body: CreateDeviceGroupDto, @Req() req: any) {
    const actor = this.getActor(req);
    return this.groupsService.create(body, actor.email);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async update(@Param('id') id: string, @Body() body: UpdateDeviceGroupDto) {
    return this.groupsService.update(id, body);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }

  @Post(':id/apply-template/:templateId')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async applyTemplate(
    @Param('id') groupId: string,
    @Param('templateId') templateId: string,
    @Body() body: ApplyTemplateToGroupDto,
    @Req() req: any,
  ) {
    return this.groupsService.applyTemplateToGroup({
      groupId,
      templateId,
      limit: body.limit,
      dryRun: body.dryRun,
      actor: this.getActor(req),
    });
  }

  private getActor(req: any): { userId: string | null; email: string | null } {
    const user = req?.user || {};

    return {
      userId: user.sub || user.id || null,
      email: user.email || null,
    };
  }
}
