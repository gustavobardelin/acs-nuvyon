import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard) // Tranca TODAS as rotas deste controller exigindo Token
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT, UserRole.FIELD_TECH)
  async getAllDevices(@Query('q') query: string) {
    return this.devicesService.findAll(query);
  }

  @Post(':id/reboot')
  @Roles(UserRole.ADMIN, UserRole.NOC) // Apenas NOC e ADMIN podem reiniciar equipamentos
  async rebootDevice(@Param('id') id: string) {
    const taskId = await this.devicesService.reboot(id);
    return { 
      message: 'Comando de reboot enfileirado com sucesso', 
      taskId 
    };
  }

  @Post(':id/refresh')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async refreshDevice(
    @Param('id') id: string, 
    @Body('objectName') objectName: string
  ) {
    const taskId = await this.devicesService.refresh(id, objectName);
    return { 
      message: 'Comando de atualização de parâmetros enfileirado', 
      taskId 
    };
  }

@Post(':id/wifi')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.SUPPORT)
  async updateWifi(
    @Param('id') id: string,
    @Body() body: { instance: string, ssid?: string, password?: string, enabled?: boolean }
  ) {
    const taskId = await this.devicesService.updateWifi(id, body.instance, body.ssid, body.password, body.enabled);
    return { 
      message: 'Comando de alteração de Wi-Fi enfileirado com sucesso', 
      taskId 
    };
  }
}