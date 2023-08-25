import { IsEmail, IsMongoId, IsNotEmpty } from 'class-validator';
import mongoose from 'mongoose';

export class CreateResumeDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  userId: mongoose.Schema.Types.ObjectId;

  @IsNotEmpty()
  url: string;

  @IsNotEmpty()
  status: string;

  @IsNotEmpty()
  company: mongoose.Schema.Types.ObjectId;

  @IsNotEmpty()
  job: mongoose.Schema.Types.ObjectId;
}

export class CreateUserCVDto {
  @IsNotEmpty()
  url: string;

  @IsNotEmpty()
  @IsMongoId()
  company: mongoose.Schema.Types.ObjectId;

  @IsNotEmpty()
  @IsMongoId()
  job: mongoose.Schema.Types.ObjectId;
}
