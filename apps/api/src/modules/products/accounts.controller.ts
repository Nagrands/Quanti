import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";

import { AccountsService } from "./accounts.service";
import { CreateAccountRequest } from "./dto/create-account.request";
import { UpdateAccountRequest } from "./dto/update-account.request";

@Controller("accounts")
export class AccountsController {
  constructor(@Inject(AccountsService) private readonly accountsService: AccountsService) {}

  @Get()
  findAll() {
    return this.accountsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.accountsService.findOne(id);
  }

  @Post()
  create(@Body() payload: CreateAccountRequest) {
    return this.accountsService.create(payload);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() payload: UpdateAccountRequest) {
    return this.accountsService.update(id, payload);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.accountsService.remove(id);
  }
}
