import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { ConfigService } from '@nestjs/config';
import { genSaltSync, hashSync, compareSync } from 'bcryptjs';
import aqp from 'api-query-params';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto, RegisterUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IUser } from './users.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,
    private configService: ConfigService,
  ) {}

  getHashPassword(password: string) {
    const salt = genSaltSync(10);
    const hash = hashSync(password, salt);
    return hash;
  }

  isValidPassword(password: string, hash: string) {
    return compareSync(password, hash);
  }

  async create(createUserDto: CreateUserDto, user: IUser) {
    const { email, password, name, age, address, gender, role, company } =
      createUserDto;
    const isExist = await this.userModel.findOne({ email });
    if (isExist) {
      throw new BadRequestException('Email exist! Again');
    }
    const userCreated = await this.userModel.create({
      name,
      email,
      password: this.getHashPassword(password),
      age,
      address,
      gender,
      role,
      company,
      createdBy: { _id: user._id, email: user.email },
    });
    return { _id: userCreated._id };
  }

  async register(registerData: RegisterUserDto) {
    const { name, email, password, age, address, gender } = registerData;
    const isExist = await this.userModel.findOne({ email });
    if (isExist) {
      throw new BadRequestException('Email exist! Again');
    }
    const user = await this.userModel.create({
      name,
      email,
      password: this.getHashPassword(password),
      age,
      address,
      gender,
      role: this.configService.get<string>('USER_ROLE_ID'),
    });
    return user;
  }

  async findAll(currentPage: number, limit: number, queryString: string) {
    const { filter, sort, projection, population } = aqp(queryString);
    delete filter.current;
    delete filter.pageSize;

    const offset = (+currentPage - 1) * +limit;
    const defaultLimit = +limit ? +limit : 10;
    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.userModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .select(['-password', '-refreshToken'])
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        'Get a user failure',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const user = this.userModel
      .findOne({
        _id: id,
      })
      .select(['-password', '-refreshToken'])
      .populate({ path: 'role', select: { name: 1 } });
    return user;
  }

  findOneByUsername(username: string) {
    const user = this.userModel
      .findOne({
        email: username,
      })
      .populate({ path: 'role', select: { name: 1, permissions: 1 } });
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, user: IUser) {
    const { name, email, age, address, gender, role, company } = updateUserDto;
    const userUpdate = await this.userModel.updateOne(
      { _id: id },
      {
        name,
        email,
        age,
        address,
        gender,
        role,
        company,
        updatedBy: user._id,
      },
    );
    return userUpdate;
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        'Delete a user failure',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const foundUser = await this.userModel.findById(id);
    if (
      foundUser &&
      foundUser.email === this.configService.get<string>('ADMIN_EMAIL')
    ) {
      throw new BadRequestException("Don't allow delete this account");
    }
    await this.userModel.updateOne({ _id: id }, { deletedBy: user._id });
    return this.userModel.softDelete({
      _id: id,
    });
  }

  async updateUserWithRefreshToken(id: string, refreshToken: string) {
    return await this.userModel.updateOne(
      { _id: id },
      {
        refreshToken,
      },
    );
  }

  async getUserByRefreshToken(refreshToken: string) {
    return await this.userModel.findOne({ refreshToken });
  }
}
