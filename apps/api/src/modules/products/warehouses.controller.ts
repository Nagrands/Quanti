import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";

import { CreateWarehouseRequest } from "./dto/create-warehouse.request";
import { UpdateWarehouseRequest } from "./dto/update-warehouse.request";
import { WarehousesService } from "./warehouses.service";

@Controller("warehouses")
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  findAll() {
    return this.warehousesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.warehousesService.findOne(id);
  }

  @Post()
  create(@Body() payload: CreateWarehouseRequest) {
    return this.warehousesService.create(payload);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() payload: UpdateWarehouseRequest) {
    return this.warehousesService.update(id, payload);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.warehousesService.remove(id);
  }
}
