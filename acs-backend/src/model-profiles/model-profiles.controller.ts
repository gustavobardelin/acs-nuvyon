import {
  BadRequestException,
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
import { UpsertModelProfileDto } from './dto/upsert-model-profile.dto';
import { ModelProfilesService } from './model-profiles.service';

@Controller('model-profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModelProfilesController {
  constructor(private readonly profilesService: ModelProfilesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async list(@Query('q') q?: string, @Query('status') status?: string) {
    return this.profilesService.list({ q, status });
  }

  @Get('suggest/from-device')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async suggestFromDevice(@Query('deviceId') deviceId?: string) {
    if (!deviceId) {
      throw new BadRequestException('deviceId é obrigatório.');
    }

    return this.profilesService.suggestFromDevice(deviceId);
  }

  @Get('by-model')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async byModel(
    @Query('manufacturer') manufacturer?: string,
    @Query('model') model?: string,
    @Query('productClass') productClass?: string,
  ) {
    return this.profilesService.findByModel({
      manufacturer,
      model,
      productClass,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async get(@Param('id') id: string) {
    return this.profilesService.get(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async create(@Body() body: UpsertModelProfileDto, @Req() req: any) {
    return this.profilesService.create(body, {
      email: req?.user?.email || null,
    });
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async update(
    @Param('id') id: string,
    @Body() body: UpsertModelProfileDto,
    @Req() req: any,
  ) {
    return this.profilesService.update(id, body, {
      email: req?.user?.email || null,
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async remove(@Param('id') id: string) {
    return this.profilesService.remove(id);
  }
}
