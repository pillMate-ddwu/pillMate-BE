import axios from 'axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { Medication } from './entities/medication.entity';

@Injectable()
export class MedicationService {
  constructor(
    @InjectRepository(Medication)
    private readonly medicationRepository: Repository<Medication>,
  ) {}

  create(createMedicationDto: CreateMedicationDto) {
    const medication = this.medicationRepository.create(createMedicationDto);

    return this.medicationRepository.save(medication);
  }

  // 공공데이터 약 검색
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

  // 전체 조회
  findAll() {
    return this.medicationRepository.find();
  }

  // 상세 조회
  async findOne(id: number) {
    const medication = await this.medicationRepository.findOneBy({ id });

    if (!medication) {
      throw new NotFoundException('약 정보를 찾을 수 없습니다.');
    }

    return medication;
  }

  // 수정
  async update(id: number, updateMedicationDto: UpdateMedicationDto) {
    const medication = await this.findOne(id);

    Object.assign(medication, updateMedicationDto);

    return this.medicationRepository.save(medication);
  }

  // 삭제
  async remove(id: number) {
    const medication = await this.findOne(id);

    await this.medicationRepository.remove(medication);

    return {
      message: '약 정보가 삭제되었습니다.',
    };
  }
}