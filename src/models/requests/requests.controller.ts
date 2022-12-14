import { Post, Controller, Req, Get, Body } from "@nestjs/common";
import { Request } from 'express';
import { HttpService } from "@nestjs/axios";
import { RequestsService } from './requests.service';
import { CreateRequestDto } from "./dto/create-request.dto";

@Controller('api/requests')
export class RequestsController {
  constructor(
    private readonly httpService: HttpService,
    private readonly requestsService: RequestsService,
  ) {}

  @Get()
  async index(@Req() request: Request) {
    const items = await this.requestsService.findAll();
    console.debug(items);
    return items.reverse();
  }

  @Get('/:id')
  async show(@Req() request: Request) {
    const item = await this.requestsService.findOne(+request.params.id);
    console.debug(item);
    return item;
  }

  @Post()
  async store(@Body() body: CreateRequestDto) {
    const item = await this.requestsService.create(body);
    console.debug(item);
    return {
      link: `${process.env.FRONTEND_URL}?hash=${item.id}`
    };
  }
}