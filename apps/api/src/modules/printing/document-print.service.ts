import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DocumentPrintDataDto } from "@quanti/shared";
import Handlebars from "handlebars";

import { PrismaService } from "../../common/prisma/prisma.service";
import { defaultDocumentTemplateV2 } from "./default-document-template";
import { PdfRenderException } from "./pdf-render.exception";
import { PDF_RENDERER, type PdfRenderer } from "./pdf-renderer";
import { PrintTemplateRepository } from "./print-template.repository";

@Injectable()
export class DocumentPrintService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PrintTemplateRepository) private readonly templates: PrintTemplateRepository,
    @Inject(PDF_RENDERER) private readonly renderer: PdfRenderer
  ) {
    Handlebars.registerHelper("formatDate", (value: string) =>
      new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)));
    Handlebars.registerHelper("formatDateRu", (value: string) =>
      new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)));
    Handlebars.registerHelper("eq", (left: unknown, right: unknown) => left === right);
  }

  async render(documentId: string, templateVersion?: number) {
    const [data, template] = await Promise.all([
      this.buildData(documentId),
      this.templates.find("DOCUMENT", templateVersion)
    ]);
    const printData = template.id === defaultDocumentTemplateV2.id
      ? {
          ...data,
          branding: {
            ...data.branding,
            documentTitle: this.documentTitle(data.type, "ru")
          }
        }
      : data;
    const body = Handlebars.compile(template.html, { strict: true })(printData);
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>${template.styles ?? ""}</style></head><body>${body}</body></html>`;

    try {
      const pdf = await this.renderer.render(html);
      return {
        fileName: `${this.safeFileName(data.number)}.pdf`,
        content: Buffer.from(pdf),
        templateVersion: template.version
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "PDF rendering failed.";
      throw new PdfRenderException(message);
    }
  }

  private async buildData(documentId: string): Promise<DocumentPrintDataDto> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        counterparty: true,
        warehouse: true,
        sourceWarehouse: true,
        destinationWarehouse: true,
        items: {
          include: { product: true },
          orderBy: { lineNo: "asc" }
        }
      }
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} was not found.`);
    }

    return {
      documentId: document.id,
      number: document.number,
      type: document.type,
      status: document.status,
      documentDate: document.documentDate.toISOString(),
      counterpartyName: document.counterparty?.name ?? null,
      warehouseName: document.warehouse?.name ?? null,
      sourceWarehouseName: document.sourceWarehouse?.name ?? null,
      destinationWarehouseName: document.destinationWarehouse?.name ?? null,
      notes: document.notes,
      totalAmount: document.totalAmount.toString(),
      items: document.items.map((item) => ({
        lineNo: item.lineNo,
        sku: item.product.sku,
        productName: item.product.name,
        unit: item.unit,
        quantity: item.quantity.toString(),
        price: item.price.toString(),
        amount: item.amount.toString()
      })),
      branding: {
        companyName: process.env.QUANTI_COMPANY_NAME?.trim() || "Quanti ERP",
        documentTitle: this.documentTitle(document.type)
      }
    };
  }

  private documentTitle(type: DocumentPrintDataDto["type"], locale: "en" | "ru" = "en") {
    const titles = locale === "ru"
      ? {
          SALE: "Продажа",
          PURCHASE: "Закупка",
          TRANSFER: "Перемещение",
          STOCK_ADJUSTMENT: "Корректировка остатков",
          RETURN_IN: "Возврат от покупателя",
          RETURN_OUT: "Возврат поставщику"
        }
      : {
          SALE: "Sales document",
          PURCHASE: "Purchase document",
          TRANSFER: "Warehouse transfer",
          STOCK_ADJUSTMENT: "Stock adjustment",
          RETURN_IN: "Incoming return",
          RETURN_OUT: "Outgoing return"
        };

    return titles[type];
  }

  private safeFileName(value: string) {
    const normalized = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-");
    return normalized || "document";
  }
}
