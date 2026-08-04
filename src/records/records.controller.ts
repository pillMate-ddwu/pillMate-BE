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

@UseGuards(JwtAuthGuard)
@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateRecordDto) {
    return this.recordsService.create(req.user.userId, dto);
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