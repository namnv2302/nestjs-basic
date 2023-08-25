import { IsNotEmpty } from 'class-validator';

export class CreateCompanyDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  logo: string;

  @IsNotEmpty()
  address: string;

  @IsNotEmpty()
  description: string;
}
