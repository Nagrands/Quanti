import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";

import { CreateWarehouseRequest } from "./dto/create-warehouse.request";
import { UpdateWarehouseRequest } from "./dto/update-warehouse.request";
import { WarehousesService } from "./warehouses.service";

@Controller("warehouses")
export class WarehousesController {
  constructor(@Inject(WarehousesService) private readonly warehousesService: WarehousesService) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.warehousesService.findAll(includeInactive === "true");
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

  @Patch(":id/restore")
  restore(@Param("id") id: string) {
    return this.warehousesService.restore(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.warehousesService.remove(id);
  }
}
