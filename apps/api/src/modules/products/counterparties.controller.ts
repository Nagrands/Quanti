import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";

import { CounterpartiesService } from "./counterparties.service";
import { CreateCounterpartyRequest } from "./dto/create-counterparty.request";
import { UpdateCounterpartyRequest } from "./dto/update-counterparty.request";

@Controller("counterparties")
export class CounterpartiesController {
  constructor(
    @Inject(CounterpartiesService) private readonly counterpartiesService: CounterpartiesService
  ) {}

  @Get()
  findAll() {
    return this.counterpartiesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.counterpartiesService.findOne(id);
  }

  @Post()
  create(@Body() payload: CreateCounterpartyRequest) {
    return this.counterpartiesService.create(payload);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() payload: UpdateCounterpartyRequest) {
    return this.counterpartiesService.update(id, payload);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.counterpartiesService.remove(id);
  }
}
