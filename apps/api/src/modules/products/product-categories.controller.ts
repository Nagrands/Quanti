import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";

import { CreateProductCategoryRequest } from "./dto/create-product-category.request";
import { UpdateProductCategoryRequest } from "./dto/update-product-category.request";
import { ProductCategoriesService } from "./product-categories.service";

@Controller("product-categories")
export class ProductCategoriesController {
  constructor(
    @Inject(ProductCategoriesService) private readonly productCategoriesService: ProductCategoriesService
  ) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.productCategoriesService.findAll(includeInactive === "true");
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.productCategoriesService.findOne(id);
  }

  @Post()
  create(@Body() payload: CreateProductCategoryRequest) {
    return this.productCategoriesService.create(payload);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() payload: UpdateProductCategoryRequest) {
    return this.productCategoriesService.update(id, payload);
  }

  @Patch(":id/restore")
  restore(@Param("id") id: string) {
    return this.productCategoriesService.restore(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.productCategoriesService.remove(id);
  }
}
