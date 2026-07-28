import axios from 'axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';

@Injectable()
export class MedicationService {
  private medications: any[] = [];

  create(createMedicationDto: CreateMedicationDto) {
    const medication = {
      id: Date.now(),
      ...createMedicationDto,
    };

    this.medications.push(medication);

    return medication;
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
    return this.medications;
  }

  // 상세 조회
  findOne(id: number) {
    return this.medications.find((medication) => medication.id === id);
  }

  // 수정
  update(id: number, updateMedicationDto: UpdateMedicationDto) {
    const medication = this.medications.find(
      (medication) => medication.id === id,
    );

    if (!medication) {
      return null;
    }

    Object.assign(medication, updateMedicationDto);

    return medication;
  }

  // 삭제
  remove(id: number) {
    const index = this.medications.findIndex(
      (medication) => medication.id === id,
    );

    if (index === -1) {
      return null;
    }

    const deletedMedication = this.medications[index];

    this.medications.splice(index, 1);

    return deletedMedication;
  }
}