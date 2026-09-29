import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MedicationService } from './medication.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';

@UseGuards(JwtAuthGuard)
@Controller('medications')
export class MedicationController {
  constructor(private readonly medicationService: MedicationService) {}

  @Post()
  create(
    @Request() req: any,
    @Body() dto: CreateMedicationDto,
  ) {
    return this.medicationService.create(
      req.user.userId,
      dto,
    );
  }

  @Get('search')
  search(
    @Query('keyword') keyword: string,
    @Query('pageNo') pageNo = '1',
    @Query('numOfRows') numOfRows = '10',
  ) {
    return this.medicationService.search(
      keyword,
      Number(pageNo),
      Number(numOfRows),
    );
  }

  // 전체 조회
  @Get()
  findAll(@Request() req: any) {
    return this.medicationService.findAll(
      req.user.userId,
    );
  }

  // 상세 조회
 @Get(':id')
  findOne(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.medicationService.findOne(
      req.user.userId,
      Number(id),
    );
  }

  // 수정
  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMedicationDto,
  ) {
    return this.medicationService.update(
      req.user.userId,
      Number(id),
      dto,
    );
  }

  // 삭제
  @Delete(':id')
  remove(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.medicationService.remove(
      req.user.userId,
      Number(id),
    );
  }
}