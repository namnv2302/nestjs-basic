import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyDocument, Company } from './schemas/company.schema';
import { InjectModel } from '@nestjs/mongoose';
import { IUser } from 'src/users/users.interface';
import mongoose from 'mongoose';
import aqp from 'api-query-params';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name)
    private companyModel: SoftDeleteModel<CompanyDocument>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto, user: IUser) {
    const { name, logo, address, description } = createCompanyDto;
    const isExist = await this.companyModel.findOne({ name });
    if (isExist) {
      throw new BadRequestException('Company exist! Again');
    }
    const company = await this.companyModel.create({
      name,
      logo,
      address,
      description,
      createdBy: { _id: user._id, email: user.email },
    });
    return { _id: company._id };
  }

  async findAll(currentPage: number, limit: number, queryString: string) {
    const { filter, sort, projection, population } = aqp(queryString);
    delete filter.current;
    delete filter.pageSize;

    const offset = (+currentPage - 1) * +limit;
    const defaultLimit = +limit ? +limit : 10;
    const totalItems = (await this.companyModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.companyModel
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
      return this.companyModel.findOne({ _id: id });
    }
    throw new HttpException(
      'Get a company failure',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto, user: IUser) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return await this.companyModel.updateOne(
        { _id: id },
        {
          ...updateCompanyDto,
          updatedBy: { _id: user._id, email: user.email },
          updatedAt: Date(),
        },
      );
    }
    throw new HttpException(
      'Update a company failure',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  async remove(id: string, user: IUser) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      await this.companyModel.updateOne(
        { _id: id },
        { deletedBy: { _id: user._id, email: user.email } },
      );
      return this.companyModel.softDelete({ _id: id });
    }
    throw new HttpException(
      'Delete a company failure',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
