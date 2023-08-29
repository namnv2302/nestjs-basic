import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { Resume, ResumeDocument } from './schemas/resume.schema';
import { CreateUserCVDto, CreateResumeDto } from './dto/create-resume.dto';
import { IUser } from 'src/users/users.interface';
import aqp from 'api-query-params';
import mongoose from 'mongoose';

@Injectable()
export class ResumesService {
  constructor(
    @InjectModel(Resume.name)
    private resumeModel: SoftDeleteModel<ResumeDocument>,
  ) {}

  async create(createResumeDto: CreateUserCVDto, user: IUser) {
    try {
      const { url, company, job } = createResumeDto;
      const resume = await this.resumeModel.create({
        url,
        company,
        job,
        email: user.email,
        userId: user._id,
        status: 'PENDING',
        history: [
          {
            status: 'PENDING',
            updatedAt: new Date(),
            updatedBy: { _id: user._id, email: user.email },
          },
        ],
        createdBy: { _id: user._id, email: user.email },
      });
      return {
        _id: resume._id,
      };
    } catch (error) {
      throw new HttpException(
        'Create a resume failure',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(currentPage: number, limit: number, queryString: string) {
    const { filter, sort, projection, population } = aqp(queryString);
    delete filter.current;
    delete filter.pageSize;

    const offset = (+currentPage - 1) * +limit;
    const defaultLimit = +limit ? +limit : 10;
    const totalItems = (await this.resumeModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.resumeModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .populate(population)
      .select(projection as any)
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
      return this.resumeModel.findById(id);
    }
    throw new HttpException(
      'Get detail a resume failure',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  async update(id: string, updateResumeDto: UpdateResumeDto, user: IUser) {
    try {
      const { status } = updateResumeDto;
      return await this.resumeModel.updateOne(
        { _id: id },
        {
          status,
          updatedBy: { _id: user._id, email: user.email },
          updatedAt: new Date(),
          $push: {
            history: {
              status: status,
              updatedBy: { _id: user._id, email: user.email },
              updatedAt: new Date(),
            },
          },
        },
      );
    } catch (error) {
      throw new HttpException(
        'Update a resume failure',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string, user: IUser) {
    try {
      await this.resumeModel.updateOne(
        { _id: id },
        {
          deletedBy: { _id: user._id, email: user.email },
        },
      );
      return await this.resumeModel.softDelete({ _id: id });
    } catch (error) {
      throw new HttpException(
        'Delete a resume failure',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  getResumesByUser(user: IUser) {
    return this.resumeModel
      .find({ userId: user._id })
      .sort('-createdAt')
      .populate([
        { path: 'company', select: { name: 1 } },
        { path: 'job', select: { name: 1 } },
      ]);
  }
}
