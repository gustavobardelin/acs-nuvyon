import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { GenieACSDevice, GenieACSTaskResponse } from './interfaces/genieacs-response.interface';

@Injectable()
export class GenieACSService {
  private readonly logger = new Logger(GenieACSService.name);

  constructor(private readonly httpService: HttpService) {}

  async getDevices(query: string = '{}', projection: string = ''): Promise<GenieACSDevice[]> {
    const url = `/devices/?query=${encodeURIComponent(query)}${projection ? `&projection=${encodeURIComponent(projection)}` : ''}`;

    const { data } = await firstValueFrom<AxiosResponse<GenieACSDevice[]>>(
      this.httpService.get<GenieACSDevice[]>(url).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(`Erro ao buscar dispositivos no GenieACS: ${error.message}`);
          throw new InternalServerErrorException('Falha na comunicação com o motor TR-069');
        }),
      ),
    );

    return data;
  }

  async createTask(deviceId: string, taskName: string, taskArgs: Record<string, any> = {}): Promise<GenieACSTaskResponse> {
    const payload = {
      name: taskName,
      device: deviceId,
      ...taskArgs,
    };

    const { data } = await firstValueFrom<AxiosResponse<GenieACSTaskResponse>>(
      this.httpService.post<GenieACSTaskResponse>('/tasks/', payload).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(`Erro ao criar task '${taskName}' para o dispositivo ${deviceId}: ${error.message}`);
          throw new InternalServerErrorException('Falha ao enfileirar comando no motor de provisionamento');
        }),
      ),
    );

    return data;
  }

  async rebootDevice(deviceId: string) {
    try {
      // O payload para reiniciar o equipamento fisicamente
      const payload = { name: 'reboot' };
      const url = `/devices/${encodeURIComponent(deviceId)}/tasks`;

      // Aqui sim o httpService existe e funciona!
      const response = await this.httpService.axiosRef.post(url, payload);
      
      this.logger.log(`Task de REBOOT enfileirada com sucesso para: ${deviceId}`);
      return response.data;
      
    } catch (error: any) {
      this.logger.error(`Erro ao criar task de reboot: ${error.response?.data || error.message}`);
      throw error;
    }
  }

  async setParameterValues(deviceId: string, parameters: [string, any, string][]) {
    try {
      // O payload exige o nome da ação e uma lista de arrays no formato: [caminho, valor, tipo]
      const payload = {
        name: 'setParameterValues',
        parameterValues: parameters
      };
      
      const url = `/devices/${encodeURIComponent(deviceId)}/tasks`;
      const response = await this.httpService.axiosRef.post(url, payload);
      
      this.logger.log(`Task de ESCRITA de Wi-Fi enfileirada para: ${deviceId}`);
      return response.data;
      
    } catch (error: any) {
      this.logger.error(`Erro ao gravar parâmetros: ${error.response?.data || error.message}`);
      throw error;
    }
  }

  async refreshObject(deviceId: string, objectName: string = '') {
    try {
      // O payload agora só precisa saber o que fazer, 
      // pois quem ele vai afetar já estará na URL
      const payload = {
        name: 'refreshObject',
        objectName: objectName
      };

      // A URL RESTful correta: /devices/ID/tasks
      // Usamos encodeURIComponent para proteger o ID que possui caracteres especiais (como %2D)
      const url = `/devices/${encodeURIComponent(deviceId)}/tasks`;

      // Faça o envio usando a sua variável HTTP existente 
      // (ajuste this.httpService.axiosRef para a forma que já está no seu arquivo)
      const response = await this.httpService.axiosRef.post(url, payload);
      
      this.logger.log(`Task de atualização enfileirada com sucesso para: ${deviceId}`);
      return response.data;
      
    } catch (error: any) {
      // Melhoramos o log para capturar a resposta exata de recusa do GenieACS (error.response.data)
      this.logger.error(`Erro ao criar task 'refreshObject': ${error.response?.data || error.message}`);
      throw error;
    }
  }
}