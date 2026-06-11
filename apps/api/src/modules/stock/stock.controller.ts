import { Controller, Get, Inject, Post, Query } from "@nestjs/common";

import { GetStockBalanceRequest } from "./dto/get-stock-balance.request";
import { ReserveStockRequest } from "./dto/reserve-stock.request";
import { StockService } from "./stock.service";

@Controller("stock")
export class StockController {
  constructor(@Inject(StockService) private readonly stockService: StockService) {}

  @Get("balance")
  getBalance(@Query() query: GetStockBalanceRequest) {
    return this.stockService.getBalance(query.productId, query.warehouseId);
  }

  @Post("reserve-check")
  reserve(@Query() query: ReserveStockRequest) {
    return this.stockService.reserveStock(query);
  }
}
