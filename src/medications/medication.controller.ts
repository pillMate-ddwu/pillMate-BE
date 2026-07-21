import {
  Body, Controller, Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { MedicationService } from './medication.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';

@Controller('medications')
export class MedicationController {
  constructor(private readonly medicationService: MedicationService) {}

  @Post()
  create(@Body() createMedicationDto: CreateMedicationDto) {
    return this.medicationService.create(createMedicationDto);
  }

  @Get()
findAll() {
  return this.medicationService.findAll();
}
//상세정보
@Get(':id')
findOne(@Param('id') id: string) {
  return this.medicationService.findOne(Number(id));
}

//수정
@Patch(':id')
update(
  @Param('id') id: string,
  @Body() updateMedicationDto: UpdateMedicationDto,
) {
  return this.medicationService.update(Number(id), updateMedicationDto);
}

//삭제
@Delete(':id')
remove(@Param('id') id: string) {
  return this.medicationService.remove(Number(id));
}
}