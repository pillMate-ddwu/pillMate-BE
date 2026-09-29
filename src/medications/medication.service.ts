import axios from 'axios';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { Medication } from './entities/medication.entity';
import { Record as MedicationRecord } from '../records/entities/record.entity';

@Injectable()
export class MedicationService {
  constructor(
    @InjectRepository(Medication)
    private readonly medicationRepository: Repository<Medication>,

    private readonly dataSource: DataSource,
  ) {}

  create(userId: number, createMedicationDto: CreateMedicationDto) {
    const medication = this.medicationRepository.create({
      ...createMedicationDto,
      userId,
      timezone: createMedicationDto.timezone ?? 'Asia/Seoul',
    });

    return this.medicationRepository.save(medication);
  }

  async search(keyword: string, pageNo: number, numOfRows: number) {
    if (!keyword) {
      throw new BadRequestException('검색어를 입력해주세요.');
    }

    const serviceKey = process.env.DRUG_API_SERVICE_KEY;

    if (!serviceKey) {
      throw new InternalServerErrorException(
        '약 검색 API 키가 설정되지 않았습니다.',
      );
    }

    const response = await axios.get(
      'https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList',
      {
        params: {
          ServiceKey: serviceKey,
          itemName: keyword,
          pageNo,
          numOfRows,
          type: 'json',
        },
      },
    );

    return response.data;
  }

  findAll(userId: number) {
    return this.medicationRepository.find({
      where: { userId },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(userId: number, id: number) {
    const medication = await this.medicationRepository.findOne({
      where: {
        id,
        userId,
      },
    });

    if (!medication) {
      throw new NotFoundException('약 정보를 찾을 수 없습니다.');
    }

    return medication;
  }

  async update(
    userId: number,
    id: number,
    updateMedicationDto: UpdateMedicationDto,
  ) {
    const medication = await this.findOne(userId, id);

    Object.assign(medication, updateMedicationDto);

    return this.medicationRepository.save(medication);
  }

  async remove(userId: number, id: number) {
    const medication = await this.findOne(userId, id);

    const recordRepository = this.dataSource.getRepository(MedicationRecord);

    const recordCount = await recordRepository.count({
      where: {
        medicationId: medication.id,
        userId,
      },
    });

    if (recordCount > 0) {
      throw new ConflictException(
        '복약 기록이 존재하는 약은 삭제할 수 없습니다.',
      );
    }

    await this.medicationRepository.remove(medication);

    return {
      message: '약 정보가 삭제되었습니다.',
    };
  }
}