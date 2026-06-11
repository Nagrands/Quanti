import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";

import { CreatePaymentRequest } from "./dto/create-payment.request";
import { PostPaymentRequest } from "./dto/post-payment.request";
import { RepostPaymentRequest } from "./dto/repost-payment.request";
import { UpdatePaymentRequest } from "./dto/update-payment.request";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly paymentsService: PaymentsService) {}

  @Get("debts/counterparties")
  getCounterpartyDebts() {
    return this.paymentsService.getCounterpartyDebts();
  }

  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.paymentsService.findOne(id);
  }

  @Post()
  create(@Body() payload: CreatePaymentRequest) {
    return this.paymentsService.createDraft(payload);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() payload: UpdatePaymentRequest) {
    return this.paymentsService.updateDraft(id, payload);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.paymentsService.removeDraft(id);
  }

  @Post(":id/post")
  post(@Param("id") id: string, @Body() payload: PostPaymentRequest) {
    return this.paymentsService.post(id, payload.postedAt);
  }

  @Post(":id/unpost")
  unpost(@Param("id") id: string) {
    return this.paymentsService.unpost(id);
  }

  @Post(":id/repost")
  repost(@Param("id") id: string, @Body() _payload: RepostPaymentRequest) {
    return this.paymentsService.repost({ id });
  }
}
