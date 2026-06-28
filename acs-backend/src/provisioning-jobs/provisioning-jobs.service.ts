import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceGroupsService } from '../device-groups/device-groups.service';
import { ProvisioningTemplatesService } from '../provisioning-templates/provisioning-templates.service';
import { RunProvisioningJobDto } from './dto/run-provisioning-job.dto';
import { ProvisioningJob } from './entities/provisioning-job.entity';

@Injectable()
export class ProvisioningJobsService {
  constructor(
    @InjectRepository(ProvisioningJob)
    private readonly jobsRepository: Repository<ProvisioningJob>,
    private readonly groupsService: DeviceGroupsService,
    private readonly templatesService: ProvisioningTemplatesService,
  ) {}

  async findAll(): Promise<ProvisioningJob[]> {
    return this.jobsRepository.find({
      order: {
        createdAt: 'DESC',
      },
      take: 100,
    });
  }

  async findOne(id: string): Promise<ProvisioningJob> {
    const job = await this.jobsRepository.findOne({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException('Campanha de provisionamento não encontrada.');
    }

    return job;
  }

  async preview(dto: RunProvisioningJobDto) {
    const group = await this.groupsService.findOne(dto.groupId);
    const template = await this.templatesService.findOne(dto.templateId);
    const limit = this.normalizeLimit(dto.limit || 20);

    const preview = await this.groupsService.applyTemplateToGroup({
      groupId: group.id,
      templateId: template.id,
      limit,
      dryRun: true,
      actor: {
        userId: null,
        email: null,
      },
    });

    return {
      ...preview,
      jobName:
        dto.name?.trim() ||
        `Campanha: ${template.name} → ${group.name}`,
      description: dto.description?.trim() || null,
    };
  }

  async run(
    dto: RunProvisioningJobDto,
    actor: {
      userId: string | null;
      email: string | null;
    },
  ): Promise<ProvisioningJob> {
    const group = await this.groupsService.findOne(dto.groupId);
    const template = await this.templatesService.findOne(dto.templateId);
    const limit = this.normalizeLimit(dto.limit || 20);

    const job = this.jobsRepository.create({
      name:
        dto.name?.trim() ||
        `Campanha: ${template.name} → ${group.name}`,
      description: dto.description?.trim() || null,
      groupId: group.id,
      groupName: group.name,
      templateId: template.id,
      templateName: template.name,
      status: 'PENDING',
      targetCount: 0,
      successCount: 0,
      failedCount: 0,
      limit,
      requestPayload: {
        groupId: group.id,
        groupName: group.name,
        templateId: template.id,
        templateName: template.name,
        limit,
        groupFilters: group.filters,
        parameterCount: template.parameters.length,
      },
      resultPayload: null,
      errorMessage: null,
      createdByEmail: actor.email || null,
      startedAt: null,
      finishedAt: null,
      durationMs: null,
    });

    const savedJob = await this.jobsRepository.save(job);

    savedJob.status = 'RUNNING';
    savedJob.startedAt = new Date();

    await this.jobsRepository.save(savedJob);

    const startedAtMs = Date.now();

    try {
      const result = await this.groupsService.applyTemplateToGroup({
        groupId: group.id,
        templateId: template.id,
        limit,
        dryRun: false,
        actor,
      });

      const matchedCount = Number((result as any).matchedCount || 0);
      const successCount = Number((result as any).successCount || 0);
      const failedCount = Number((result as any).failedCount || 0);

      savedJob.status = failedCount > 0 ? 'FAILED' : 'COMPLETED';
      savedJob.targetCount = matchedCount;
      savedJob.successCount = successCount;
      savedJob.failedCount = failedCount;
      savedJob.resultPayload = result as Record<string, any>;
      savedJob.errorMessage =
        failedCount > 0
          ? `${failedCount} dispositivo(s) falharam.`
          : null;
      savedJob.finishedAt = new Date();
      savedJob.durationMs = Date.now() - startedAtMs;

      return this.jobsRepository.save(savedJob);
    } catch (error: any) {
      savedJob.status = 'FAILED';
      savedJob.errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Falha ao executar campanha.';
      savedJob.resultPayload = {
        error: savedJob.errorMessage,
      };
      savedJob.finishedAt = new Date();
      savedJob.durationMs = Date.now() - startedAtMs;

      return this.jobsRepository.save(savedJob);
    }
  }

  private normalizeLimit(limit: number): number {
    const parsed = Number(limit || 20);

    if (!Number.isFinite(parsed)) return 20;
    if (parsed < 1) return 1;
    if (parsed > 100) return 100;

    return Math.floor(parsed);
  }
}
