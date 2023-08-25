import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Job, JobDocument } from './schemas/job.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from 'src/users/users.interface';
import mongoose from 'mongoose';
import aqp from 'api-query-params';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name)
    private jobModel: SoftDeleteModel<JobDocument>,
  ) {}

  async create(createJobDto: CreateJobDto, user: IUser) {
    const {
      name,
      skills,
      company,
      salary,
      quantity,
      level,
      description,
      location,
      startDate,
      endDate,
      isActive,
    } = createJobDto;
    const job = await this.jobModel.create({
      name,
      skills,
      company,
      salary,
      quantity,
      level,
      description,
      location,
      startDate,
      endDate,
      isActive,
      createdBy: { _id: user._id, email: user.email },
    });
    return { _id: job._id };
  }

  async findAll(currentPage: number, limit: number, queryString: string) {
    const { filter, sort, projection, population } = aqp(queryString);
    delete filter.current;
    delete filter.pageSize;

    const offset = (+currentPage - 1) * +limit;
    const defaultLimit = +limit ? +limit : 10;
    const totalItems = (await this.jobModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.jobModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .populate(population)
      .exec();

    return {
      result,
      meta: {
        current: currentPage,
        pageSize: limit,
        pages: totalPages,
        total: totalItems,
      },
    };
  }

  findOne(id: string) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return this.jobModel.findOne({ _id: id });
    }
    throw new HttpException(
      'Get a job failure',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  async update(id: string, updateJobDto: UpdateJobDto, user: IUser) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return await this.jobModel.updateOne(
        { _id: id },
        {
          ...updateJobDto,
          updatedBy: { _id: user._id, email: user.email },
          updatedAt: Date(),
        },
      );
    }
    throw new HttpException(
      'Update a job failure',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  async remove(id: string, user: IUser) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      await this.jobModel.updateOne(
        { _id: id },
        {
          deletedBy: { _id: user._id, email: user.email },
        },
      );
      return await this.jobModel.softDelete({ _id: id });
    }
    throw new HttpException(
      'Delete a job failure',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
