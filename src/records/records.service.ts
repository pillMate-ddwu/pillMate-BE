import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Record } from './entities/record.entity';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';

@Injectable()
export class RecordsService {
  constructor(
    @InjectRepository(Record)
    private recordsRepository: Repository<Record>,
  ) {}

  // 복약 기록 생성 (완료/건너뛰기)
  async create(userId: number, dto: CreateRecordDto) {
    const record = this.recordsRepository.create({
      userId,
      medicationId: dto.medicationId,
      scheduledDate: dto.scheduledDate,
      status: dto.status,
    });
    return this.recordsRepository.save(record);
  }

  // 특정 유저의 전체 기록 조회 (선택적으로 날짜 필터링)
  async findAll(userId: number, date?: string) {
    const where: any = { userId };
    if (date) {
      where.scheduledDate = date;
    }
    return this.recordsRepository.find({
      where,
      order: { scheduledDate: 'DESC' },
    });
  }

  // 기록 상태 수정 (본인 기록만 수정 가능)
  async update(userId: number, id: number, dto: UpdateRecordDto) {
    const record = await this.recordsRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException('기록을 찾을 수 없습니다.');
    }
    if (record.userId !== userId) {
      throw new ForbiddenException('본인의 기록만 수정할 수 있습니다.');
    }

    record.status = dto.status;
    return this.recordsRepository.save(record);
  }
}