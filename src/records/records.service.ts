import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Record, RecordStatus } from './entities/record.entity';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { BulkCreateRecordDto } from './dto/bulk-create-record.dto';
import { Medication } from '../medications/entities/medication.entity';

@Injectable()
export class RecordsService {
  constructor(
    @InjectRepository(Record)
    private recordsRepository: Repository<Record>,

    @InjectRepository(Medication)
    private readonly medicationRepository:
      Repository<Medication>,
  ) {}

  // 복약 기록 생성 (완료/건너뛰기)
 async create(
  userId: number,
  dto: CreateRecordDto,
) {
  const medication =
    await this.findOwnedMedication(
      userId,
      dto.medicationId,
    );

  const record =
    this.recordsRepository.create({
      userId,
      medicationId: medication.id,
      medication,
      scheduledDate: dto.scheduledDate,
      status: dto.status,
      actualTime: dto.actualTime
        ? new Date(dto.actualTime)
        : null,
    });

  if (
    record.status === RecordStatus.TAKEN &&
    !record.actualTime
  ) {
    record.actualTime = new Date();
  }

  return this.recordsRepository.save(record);
}
  // 특정 유저의 전체 기록 조회 (선택적으로 날짜 필터링)
  async findAll(userId: number, date?: string) {
    const where: {
      userId: number;
      scheduledDate?: string;
    } = {
      userId,
    };

    if (date) {
      where.scheduledDate = date;
    }

    return this.recordsRepository.find({
      where,
      order: {
        scheduledDate: 'DESC',
        recordedAt: 'DESC',
      },
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

    if (record.userId !== userId) {
      throw new ForbiddenException(
        '본인의 기록만 수정할 수 있습니다.',
      );
    }

    if (dto.status !== undefined) {
      record.status = dto.status;

      if (
        dto.status === RecordStatus.TAKEN &&
        !dto.actualTime &&
        !record.actualTime
      ) {
        record.actualTime = new Date();
      }

      if (dto.status === RecordStatus.SKIPPED) {
        record.actualTime = null;
      }
    }

    if (dto.actualTime !== undefined) {
      record.actualTime = new Date(dto.actualTime);
    }

    return this.recordsRepository.save(record);
  }

  async getMonthlyCalendar(
  userId: number,
  month: string,
) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new BadRequestException(
      'month는 YYYY-MM 형식이어야 합니다.',
    );
  }

  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthNumber = Number(monthText);

  const lastDay = new Date(
    Date.UTC(year, monthNumber, 0),
  ).getUTCDate();

  const startDate = `${month}-01`;
  const endDate =
    `${month}-${String(lastDay).padStart(2, '0')}`;

  const records = await this.recordsRepository.find({
    where: {
      userId,
      scheduledDate: Between(startDate, endDate),
    },
    order: {
      scheduledDate: 'ASC',
    },
  });

  const grouped = new Map<
    string,
    {
      taken: number;
      skipped: number;
      total: number;
    }
  >();

  for (const record of records) {
    const current = grouped.get(
      record.scheduledDate,
    ) ?? {
      taken: 0,
      skipped: 0,
      total: 0,
    };

    current.total += 1;

    if (record.status === RecordStatus.TAKEN) {
      current.taken += 1;
    }

    if (record.status === RecordStatus.SKIPPED) {
      current.skipped += 1;
    }

    grouped.set(record.scheduledDate, current);
  }

  const days = Array.from(grouped.entries()).map(
    ([date, counts]) => {
      let status:
        | 'completed'
        | 'partial'
        | 'missed';

      if (counts.taken === counts.total) {
        status = 'completed';
      } else if (counts.skipped === counts.total) {
        status = 'missed';
      } else {
        status = 'partial';
      }

      return {
        date,
        status,
        total: counts.total,
        taken: counts.taken,
        skipped: counts.skipped,
      };
    },
  );

  return {
    month,
    days,
    };
  }

  async getWeeklyStats(
    userId: number,
    startDate: string,
  ) {
    if (
      !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(
        startDate,
      )
    ) {
      throw new BadRequestException(
        'startDate	parser는 YYYYnub-MM-DD 형식이어야 합니다.',
      );
    }

    const start = new Date(
      `${startDate}T00:00:00.000Z`,
    );

    if (
      Number.isNaN(start.getTime()) ||
      start.toISOString().slice(0, 10) !==
        startDate
    ) {
      throw new BadRequestException(
        '유효하지 않은 날짜입니다.',
      );
    }

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);

    const endDate = end
      .toISOString()
      .slice(0, 10);

    const records =
      await this.recordsRepository.find({
        where: {
          userId,
          scheduledDate: Between(
            startDate,
            endDate,
          ),
        },
        order: {
          scheduledDate: 'ASC',
        },
      });

    const days = Array.from(
      { length: 7 },
      (_, index) => {
        const date = new Date(start);
        date.setUTCDate(
          date.getUTCDate() + index,
        );

        const dateText = date
          .toISOString()
          .slice(0, 10);

        const dailyRecords = records.filter(
          (record) =>
            record.scheduledDate === dateText,
        );

        const total = dailyRecords.length;

        const taken = dailyRecords.filter(
          (record) =>
            record.status ===
            RecordStatus.TAKEN,
        ).length;

        const skipped = dailyRecords.filter(
          (record) =>
            record.status ===
            RecordStatus.SKIPPED,
        ).length;

        const adherenceRate =
          total === 0
            ? 0
            : Math.round(
                (taken / total) * 100,
              );

        return {
          date: dateText,
          total,
          taken,
          skipped,
          adherenceRate,
        };
      },
    );

    const total = records.length;

    const taken = records.filter(
      (record) =>
        record.status === RecordStatus.TAKEN,
    ).length;

    const skipped = records.filter(
      (record) =>
        record.status === RecordStatus.SKIPPED,
    ).length;

    const adherenceRate =
      total === 0
        ? 0
        : Math.round((taken / total) * 100);

    return {
      startDate,
      endDate,
      total,
      taken,
      skipped,
      adherenceRate,
      days,
    };
  }

  async getMonthlyStats(
  userId: number,
  month: string,
) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new BadRequestException(
      'month는 YYYY-MM 형식이어야 합니다.',
    );
  }

  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthNumber = Number(monthText);

  const lastDay = new Date(
    Date.UTC(year, monthNumber, 0),
  ).getUTCDate();

  const startDate = `${month}-01`;
  const endDate =
    `${month}-${String(lastDay).padStart(2, '0')}`;

  const records = await this.recordsRepository.find({
    where: {
      userId,
      scheduledDate: Between(
        startDate,
        endDate,
      ),
    },
  });

  const total = records.length;

  const taken = records.filter(
    (record) =>
      record.status === RecordStatus.TAKEN,
  ).length;

  const skipped = records.filter(
    (record) =>
      record.status === RecordStatus.SKIPPED,
  ).length;

  const adherenceRate =
    total === 0
      ? 0
      : Math.round((taken / total) * 100);

  return {
    month,
    total,
    taken,
    skipped,
    adherenceRate,
  };
}

  async bulkCreate(
  userId: number,
  dto: BulkCreateRecordDto,
) {
  const created: Record[] = [];
  const duplicates: string[] = [];

  for (const item of dto.records) {
    const existingRecord =
      await this.recordsRepository.findOne({
        where: {
          userId,
          clientRecordId:
            item.clientRecordId,
        },
      });

    if (existingRecord) {
      duplicates.push(item.clientRecordId);
      continue;
    }
    const medication =
      await this.findOwnedMedication(
        userId,
        item.medicationId,
      );

    const record =
    this.recordsRepository.create({
      userId,
      clientRecordId: item.clientRecordId,
      medicationId: medication.id,
      medication,
      scheduledDate: item.scheduledDate,
      status: item.status,
      actualTime: item.actualTime
        ? new Date(item.actualTime)
        : item.status === RecordStatus.TAKEN
          ? new Date()
          : null,
    });

    const savedRecord =
      await this.recordsRepository.save(record);

    created.push(savedRecord);
  }

  return {
    requestedCount: dto.records.length,
    createdCount: created.length,
    duplicateCount: duplicates.length,
    created,
    duplicates,
  };
}

  private async findOwnedMedication(
  userId: number,
  medicationId: number,
) {
  const medication =
    await this.medicationRepository.findOne({
      where: {
        id: medicationId,
        userId,
      },
    });

  if (!medication) {
    throw new NotFoundException(
      '본인 소유의 약 정보를 찾을 수 없습니다.',
    );
  }

  return medication;
}
}