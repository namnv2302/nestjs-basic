import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Permission, PermissionDocument } from './schemas/permission.schema';
import { IUser } from 'src/users/users.interface';
import mongoose from 'mongoose';
import aqp from 'api-query-params';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name)
    private permissionModel: SoftDeleteModel<PermissionDocument>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto, user: IUser) {
    const { name, apiPath, method, module } = createPermissionDto;
    const isExist = await this.permissionModel.findOne({
      apiPath,
      method: method.toUpperCase(),
    });
    if (isExist) {
      throw new HttpException(
        'Permission already existed',
        HttpStatus.METHOD_NOT_ALLOWED,
      );
    }
    try {
      const newPermission = await this.permissionModel.create({
        name,
        apiPath,
        method: method.toUpperCase(),
        module,
        createdBy: { _id: user._id, email: user.email },
      });
      return {
        _id: newPermission._id,
      };
    } catch (error) {
      throw new HttpException(
        'Create permission failure',
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
    const totalItems = (await this.permissionModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.permissionModel
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
      return this.permissionModel.findById(id);
    }
    throw new HttpException(
      'Get detail permission failure',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  update(id: string, updatePermissionDto: UpdatePermissionDto, user: IUser) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return this.permissionModel.updateOne(
        { _id: id },
        {
          ...updatePermissionDto,
          method: updatePermissionDto.method.toUpperCase(),
          updatedBy: { _id: user._id, email: user.email },
          updatedAt: new Date(),
        },
      );
    }
    throw new HttpException(
      'Updated failure',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  async remove(id: string, user: IUser) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      await this.permissionModel.updateOne(
        { _id: id },
        {
          deletedBy: { _id: user._id, email: user.email },
        },
      );
      return await this.permissionModel.softDelete({ _id: id });
    }
    throw new HttpException(
      'Delete a permission failure',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
