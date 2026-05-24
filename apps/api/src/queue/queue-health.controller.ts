import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators';
import { QueueService } from './queue.service';

@Controller('queues')
export class QueueHealthController {
  constructor(private readonly queueService: QueueService) {}

  @Public()
  @Get('health')
  getDashboardHealth() {
    return this.queueService.getDashboardHealth();
  }
}
