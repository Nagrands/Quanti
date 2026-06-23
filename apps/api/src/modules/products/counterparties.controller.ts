import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";

import { CounterpartiesService } from "./counterparties.service";
import { CreateCounterpartyRequest } from "./dto/create-counterparty.request";
import { UpdateCounterpartyRequest } from "./dto/update-counterparty.request";

@Controller("counterparties")
export class CounterpartiesController {
  constructor(
    @Inject(CounterpartiesService) private readonly counterpartiesService: CounterpartiesService
  ) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.counterpartiesService.findAll(includeInactive === "true");
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

  @Patch(":id/restore")
  restore(@Param("id") id: string) {
    return this.counterpartiesService.restore(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.counterpartiesService.remove(id);
  }
}
