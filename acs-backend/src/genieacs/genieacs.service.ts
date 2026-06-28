// acs-backend/src/genieacs/genieacs.service.ts

import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

type GenieAcsTask = Record<string, any>;
type ParameterValue = [string, any, string];

@Injectable()
export class GenieACSService {
  private readonly logger = new Logger(GenieACSService.name);
  private readonly client: AxiosInstance;

  constructor() {
    const baseURL =
      process.env.GENIEACS_NBI_URL?.trim() || 'http://genieacs-nbi:7557';

    const timeout = Number(process.env.GENIEACS_TIMEOUT || 30000);

    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`GenieACS NBI URL: ${baseURL}`);
    this.logger.log(`GenieACS timeout: ${timeout}ms`);
  }

  async getDevices(query = '{}') {
    const response = await this.client.get('/devices/', {
      params: {
        query,
      },
    });

    return response.data;
  }

  async rebootDevice(deviceId: string) {
    return this.createTask(
      deviceId,
      {
        name: 'reboot',
      },
      true,
    );
  }

  async refreshObject(deviceId: string, objectName = '') {
    return this.createTask(
      deviceId,
      {
        name: 'refreshObject',
        objectName,
      },
      true,
    );
  }

  async setParameterValues(
    deviceId: string,
    parameterValues: ParameterValue[],
  ) {
    return this.createTask(
      deviceId,
      {
        name: 'setParameterValues',
        parameterValues,
      },
      true,
    );
  }

  private async createTask(
    deviceId: string,
    task: GenieAcsTask,
    useConnectionRequest = true,
  ) {
    const encodedDeviceId = encodeURIComponent(deviceId);

    const path = useConnectionRequest
      ? `/devices/${encodedDeviceId}/tasks?connection_request`
      : `/devices/${encodedDeviceId}/tasks`;

    this.logger.log(
      `Enviando task GenieACS: ${path} | ${JSON.stringify(task)}`,
    );

    try {
      const response = await this.client.post(path, task);

      this.logger.log(
        `Task GenieACS OK: status=${response.status} response=${JSON.stringify(
          response.data,
        )}`,
      );

      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const message = error?.message;

      this.logger.error(
        `Falha task GenieACS: status=${status} message=${message} response=${JSON.stringify(
          data,
        )}`,
      );

      throw error;
    }
  }
}