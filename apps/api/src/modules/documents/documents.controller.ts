import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";

import { CreateDocumentRequest } from "./dto/create-document.request";
import { PostDocumentRequest } from "./dto/post-document.request";
import { RepostDocumentRequest } from "./dto/repost-document.request";
import { UpdateDocumentRequest } from "./dto/update-document.request";
import { DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.documentsService.findOne(id);
  }

  @Post()
  create(@Body() payload: CreateDocumentRequest) {
    return this.documentsService.createDraft(payload);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() payload: UpdateDocumentRequest) {
    return this.documentsService.updateDraft(id, payload);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.documentsService.removeDraft(id);
  }

  @Post(":id/post")
  post(@Param("id") id: string, @Body() payload: PostDocumentRequest) {
    return this.documentsService.post(id, payload.postedAt);
  }

  @Post(":id/unpost")
  unpost(@Param("id") id: string) {
    return this.documentsService.unpost(id);
  }

  @Post(":id/repost")
  repost(@Param("id") id: string, @Body() payload: RepostDocumentRequest) {
    return this.documentsService.repost({
      id,
      postedAt: payload.postedAt
    });
  }
}
