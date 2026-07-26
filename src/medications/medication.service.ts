import { Injectable } from '@nestjs/common';
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
  //조회
findAll() {
  return this.medications;
}

//상세정보
findOne(id: number) {
  return this.medications.find((medication) => medication.id === id);
}

update(id: number, updateMedicationDto: UpdateMedicationDto) {
  const medication = this.medications.find((medication) => medication.id === id);

  if (!medication) {
    return null;
  }

  Object.assign(medication, updateMedicationDto);

  return medication;
}

//삭제
remove(id: number) {
  const index = this.medications.findIndex((medication) => medication.id === id);

  if (index === -1) {
    return null;
  }

  const deletedMedication = this.medications[index];

  this.medications.splice(index, 1);

  return deletedMedication;
}
}



