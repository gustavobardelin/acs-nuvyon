// acs-backend/src/device-actions/device-actions.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeviceAction,
  DeviceActionMethod,
  DeviceActionStatus,
  DeviceActionType,
} from './entities/device-action.entity';

interface StartActionInput {
  deviceId: string;
  deviceLabel?: string | null;
  actionType: DeviceActionType;
  actionLabel: string;
  method?: DeviceActionMethod;
  objectName?: string | null;
  requestedByUserId?: string | null;
  requestedByEmail?: string | null;
  requestPayload?: Record<string, any> | null;
}

@Injectable()
export class DeviceActionsService {
  constructor(
    @InjectRepository(DeviceAction)
    private readonly deviceActionsRepository: Repository<DeviceAction>,
  ) {}

  async startAction(input: StartActionInput): Promise<DeviceAction> {
    const action = this.deviceActionsRepository.create({
      deviceId: input.deviceId,
      deviceLabel: input.deviceLabel || null,
      actionType: input.actionType,
      actionLabel: input.actionLabel,
      status: DeviceActionStatus.PENDING,
      method: input.method || DeviceActionMethod.CONNECTION_REQUEST,
      objectName: input.objectName || null,
      requestedByUserId: input.requestedByUserId || null,
      requestedByEmail: input.requestedByEmail || null,
      requestPayload: this.safeJson(input.requestPayload || null),
      responsePayload: null,
      responseStatusCode: null,
      errorMessage: null,
      startedAt: new Date(),
      finishedAt: null,
      durationMs: null,
    });

    return this.deviceActionsRepository.save(action);
  }

  async markSuccess(
    actionId: string,
    responsePayload?: Record<string, any> | any,
    responseStatusCode?: number | null,
  ): Promise<DeviceAction> {
    const action = await this.deviceActionsRepository.findOne({
      where: { id: actionId },
    });

    if (!action) {
      throw new Error(`DeviceAction ${actionId} não encontrada.`);
    }

    const finishedAt = new Date();

    action.status = DeviceActionStatus.SUCCESS;
    action.finishedAt = finishedAt;
    action.durationMs = finishedAt.getTime() - action.startedAt.getTime();
    action.responsePayload = this.safeJson(responsePayload || null);
    action.responseStatusCode = responseStatusCode || null;
    action.errorMessage = null;

    return this.deviceActionsRepository.save(action);
  }

  async markFailed(
    actionId: string,
    error: any,
    responseStatusCode?: number | null,
  ): Promise<DeviceAction> {
    const action = await this.deviceActionsRepository.findOne({
      where: { id: actionId },
    });

    if (!action) {
      throw new Error(`DeviceAction ${actionId} não encontrada.`);
    }

    const finishedAt = new Date();

    action.status = DeviceActionStatus.FAILED;
    action.finishedAt = finishedAt;
    action.durationMs = finishedAt.getTime() - action.startedAt.getTime();
    action.responseStatusCode =
      responseStatusCode || error?.response?.status || null;
    action.responsePayload = this.safeJson(error?.response?.data || null);
    action.errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      'Falha desconhecida ao executar ação.';

    return this.deviceActionsRepository.save(action);
  }

  async findByDeviceId(deviceId: string, limit = 30): Promise<DeviceAction[]> {
    return this.deviceActionsRepository.find({
      where: { deviceId },
      order: { createdAt: 'DESC' },
      take: this.normalizeLimit(limit),
    });
  }

  async findRecent(limit = 50): Promise<DeviceAction[]> {
    return this.deviceActionsRepository.find({
      order: { createdAt: 'DESC' },
      take: this.normalizeLimit(limit),
    });
  }

  private normalizeLimit(limit: number): number {
    if (!Number.isFinite(limit)) return 30;
    if (limit < 1) return 1;
    if (limit > 200) return 200;
    return Math.floor(limit);
  }

  private safeJson(value: any): Record<string, any> | null {
    if (value === null || value === undefined) return null;

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return {
        raw: String(value),
      };
    }
  }
}
