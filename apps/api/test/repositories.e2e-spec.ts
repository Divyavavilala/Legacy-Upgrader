import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { TestAppModule } from './test-app.module';
import { HttpExceptionFilter } from '../src/common/filters';
import { LoggingInterceptor, TransformResponseInterceptor } from '../src/common/interceptors';
import { QueueService } from '../src/queue';

describe('Repositories & Scans (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let repositoryId: string;

  const mockQueueService = {
    enqueueRepositoryScan: jest.fn().mockResolvedValue('mock-job-id'),
    enqueueDependencyAnalysis: jest.fn(),
    enqueueAiModernization: jest.fn(),
    enqueueReportGeneration: jest.fn(),
    getDashboardHealth: jest.fn(),
    onModuleInit: jest.fn(),
    onApplicationShutdown: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    })
      .overrideProvider(QueueService)
      .useValue(mockQueueService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformResponseInterceptor(),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a user and organization', async () => {
    const slug = `org-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `e2e-${Date.now()}@example.com`,
        password: 'SecurePass1',
        name: 'E2E User',
        organizationName: 'E2E Org',
        organizationSlug: slug,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
  });

  it('creates a repository', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/repositories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Legacy Frontend',
        slug: 'legacy-frontend',
        gitUrl: 'https://github.com/acme/legacy-frontend.git',
        defaultBranch: 'main',
      })
      .expect(201);

    expect(res.body.data.slug).toBe('legacy-frontend');
    repositoryId = res.body.data.id;
  });

  it('lists repositories for the organization', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/repositories')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: repositoryId })]),
    );
  });

  it('triggers a scan and returns queued scan', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/repositories/${repositoryId}/scan`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    expect(res.body.data.status).toBe('QUEUED');
    expect(mockQueueService.enqueueRepositoryScan).toHaveBeenCalled();
  });

  it('rejects invalid git URL on create', async () => {
    await request(app.getHttpServer())
      .post('/api/repositories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Bad Repo',
        slug: 'bad-repo',
        gitUrl: 'not-a-git-url',
      })
      .expect(400);
  });
});
