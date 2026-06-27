import { Test, TestingModule } from '@nestjs/testing';
import { GenieacsService } from './genieacs.service';

describe('GenieacsService', () => {
  let service: GenieacsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GenieacsService],
    }).compile();

    service = module.get<GenieacsService>(GenieacsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
