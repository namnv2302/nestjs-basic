import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role, RoleDocument } from './schemas/role.schema';
import { IUser } from 'src/users/users.interface';
import mongoose from 'mongoose';
import aqp from 'api-query-params';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name)
    private roleModel: SoftDeleteModel<RoleDocument>,
    private configService: ConfigService,
  ) {}

  async create(createRoleDto: CreateRoleDto, user: IUser) {
    const { name, description, isActive, permissions } = createRoleDto;
    const checkNameExist = await this.roleModel.findOne({
      name: name.toUpperCase(),
    });
    if (checkNameExist) {
      throw new HttpException(
        'Name role already existed',
        HttpStatus.METHOD_NOT_ALLOWED,
      );
    }
    try {
      const newRole = await this.roleModel.create({
        name: name.toUpperCase(),
        description,
        isActive,
        permissions,
        createdBy: { _id: user._id, email: user.email },
      });
      return {
        _id: newRole._id,
      };
    } catch (error) {
      throw new HttpException(
        'Create new role failure',
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
    const totalItems = (await this.roleModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.roleModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .populate(population)
      .select(projection)
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

  async findOne(id: string) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return await this.roleModel.findById(id).populate({
        path: 'permissions',
        select: { _id: 1, apiPath: 1, name: 1, method: 1, module: 1 },
      });
    }
    throw new HttpException(
      'Get a role failure',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  async update(id: string, updateRoleDto: UpdateRoleDto, user: IUser) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return await this.roleModel.updateOne(
        { _id: id },
        {
          ...updateRoleDto,
          name: updateRoleDto.name.toUpperCase(),
          updatedBy: { _id: user._id, email: user.email },
          updatedAt: new Date(),
        },
      );
    }
    throw new HttpException(
      'Update a role failure',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  async remove(id: string, user: IUser) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      const foundRole = await this.roleModel.findById(id);
      if (
        foundRole &&
        foundRole.name === this.configService.get<string>('ADMIN_ROLE_NAME')
      ) {
        throw new BadRequestException("Don't allow delete this role");
      }
      await this.roleModel.updateOne(
        { _id: id },
        {
          deletedBy: { _id: user._id, email: user.email },
        },
      );
      return await this.roleModel.softDelete({ _id: id });
    }
    throw new HttpException(
      'Delete a role failure',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
