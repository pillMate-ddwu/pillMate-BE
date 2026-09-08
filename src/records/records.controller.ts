import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RecordsService } from './records.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BulkCreateRecordDto } from './dto/bulk-create-record.dto';

@UseGuards(JwtAuthGuard)
@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Post('bulk')
  async bulkCreate(
    @Request() req: any,
    @Body() dto: BulkCreateRecordDto,
  ) {
    return this.recordsService.bulkCreate(
      req.user.userId,
      dto,
    );
  }

  @Post()
  async create(@Request() req: any, @Body() dto: CreateRecordDto) {
    return this.recordsService.create(req.user.userId, dto);
  }

  @Get('calendar')
  async getMonthlyCalendar(
    @Request() req: any,
    @Query('month') month: string,
  ) {
    return this.recordsService.getMonthlyCalendar(
      req.user.userId,
      month,
    );
  }

  @Get('stats/monthly')
  async getMonthlyStats(
   @Request() req: any,
    @Query('month') month: string,
  ) {
    return this.recordsService.getMonthlyStats(
      req.user.userId,
      month,
    );
  }

  @Get()
  async findAll(@Request() req: any, @Query('date') date?: string) {
    return this.recordsService.findAll(req.user.userId, date);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRecordDto,
  ) {
    return this.recordsService.update(req.user.userId, parseInt(id, 10), dto);
  }
}