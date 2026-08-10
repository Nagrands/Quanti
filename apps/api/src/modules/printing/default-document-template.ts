export const defaultDocumentTemplateV1 = {
  id: "default-document-template-v1",
  scope: "DOCUMENT" as const,
  name: "Default document",
  version: 1,
  html: `
    <main class="document">
      <header class="document__header">
        <div>
          <p class="company">{{branding.companyName}}</p>
          <h1>{{branding.documentTitle}}</h1>
        </div>
        <div class="document__identity">
          <strong>{{number}}</strong>
          <span>{{formatDate documentDate}}</span>
          <span>{{status}}</span>
        </div>
      </header>

      <section class="document__meta">
        {{#if counterpartyName}}<div><span>Counterparty</span><strong>{{counterpartyName}}</strong></div>{{/if}}
        {{#if warehouseName}}<div><span>Warehouse</span><strong>{{warehouseName}}</strong></div>{{/if}}
        {{#if sourceWarehouseName}}<div><span>Source warehouse</span><strong>{{sourceWarehouseName}}</strong></div>{{/if}}
        {{#if destinationWarehouseName}}<div><span>Destination warehouse</span><strong>{{destinationWarehouseName}}</strong></div>{{/if}}
      </section>

      <table>
        <thead><tr><th>#</th><th>SKU</th><th>Product</th><th>Unit</th><th class="number">Quantity</th><th class="number">Price</th><th class="number">Amount</th></tr></thead>
        <tbody>
          {{#each items}}
            <tr><td>{{lineNo}}</td><td>{{sku}}</td><td>{{productName}}</td><td>{{unit}}</td><td class="number">{{quantity}}</td><td class="number">{{price}}</td><td class="number">{{amount}}</td></tr>
          {{/each}}
        </tbody>
      </table>

      <footer>
        {{#if notes}}<p class="notes"><span>Notes</span>{{notes}}</p>{{/if}}
        <div class="total"><span>Total</span><strong>{{totalAmount}}</strong></div>
      </footer>
    </main>
  `,
  styles: `
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #10233e; font-family: Arial, sans-serif; font-size: 11px; }
    .document__header { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 18px; border-bottom: 2px solid #10233e; }
    .company { margin: 0 0 8px; color: #66758a; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    h1 { margin: 0; font-size: 26px; }
    .document__identity { display: grid; justify-items: end; gap: 5px; }
    .document__identity strong { font-size: 18px; }
    .document__identity span { color: #66758a; }
    .document__meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin: 22px 0; }
    .document__meta div { display: grid; gap: 4px; }
    .document__meta span, .notes span, .total span { color: #66758a; font-size: 9px; font-weight: 700; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 9px 8px; border-bottom: 1px solid #d9e0e8; text-align: left; }
    th { color: #66758a; background: #f6f8fa; font-size: 9px; text-transform: uppercase; }
    .number { text-align: right; font-variant-numeric: tabular-nums; }
    footer { display: flex; align-items: flex-start; gap: 24px; margin-top: 24px; }
    .notes { display: grid; flex: 1; gap: 6px; margin: 0; line-height: 1.5; }
    .total { display: grid; min-width: 180px; gap: 6px; padding: 14px; border: 1px solid #c8d1dc; text-align: right; }
    .total strong { font-size: 20px; }
  `
};

export const defaultDocumentTemplateV2 = {
  id: "default-document-template-v2",
  scope: "DOCUMENT" as const,
  name: "Стандартная форма документа",
  version: 2,
  html: `
    <main class="document">
      <header class="document__header">
        <h1>{{branding.documentTitle}}</h1>
        <div class="document__identity">
          <strong>{{number}}</strong>
          <span>{{formatDateRu documentDate}}</span>
        </div>
      </header>

      <section class="document__meta">
        {{#if counterpartyName}}<div><span>Контрагент</span><strong>{{counterpartyName}}</strong></div>{{/if}}
        {{#if sourceWarehouseName}}<div><span>Склад-отправитель</span><strong>{{sourceWarehouseName}}</strong></div>{{/if}}
        {{#if destinationWarehouseName}}<div><span>Склад-получатель</span><strong>{{destinationWarehouseName}}</strong></div>{{/if}}
      </section>

      <table>
        <thead>
          <tr>
            <th>№</th>
            {{#unless (eq type "SALE")}}<th>Артикул</th>{{/unless}}
            <th>Товар</th>
            <th class="number">Количество</th>
            <th>Ед. изм.</th>
            <th class="number">Цена</th>
            <th class="number">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {{#each items}}
            <tr>
              <td>{{lineNo}}</td>
              {{#unless (eq ../type "SALE")}}<td>{{sku}}</td>{{/unless}}
              <td>{{productName}}</td>
              <td class="number">{{quantity}}</td>
              <td>{{unit}}</td>
              <td class="number">{{price}}</td>
              <td class="number">{{amount}}</td>
            </tr>
          {{/each}}
        </tbody>
      </table>

      <footer>
        {{#if notes}}<p class="notes"><span>Комментарий</span>{{notes}}</p>{{/if}}
        <div class="total"><span>Итого</span><strong>{{totalAmount}}</strong></div>
      </footer>
    </main>
  `,
  styles: `
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #10233e; font-family: Arial, sans-serif; font-size: 11px; }
    .document__header { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 18px; border-bottom: 2px solid #10233e; }
    h1 { margin: 0; font-size: 26px; }
    .document__identity { display: grid; justify-items: end; gap: 5px; }
    .document__identity strong { font-size: 18px; }
    .document__identity span { color: #66758a; }
    .document__meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin: 22px 0; }
    .document__meta:empty { display: none; }
    .document__meta div { display: grid; gap: 4px; }
    .document__meta span, .notes span, .total span { color: #66758a; font-size: 9px; font-weight: 700; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 9px 8px; border-bottom: 1px solid #d9e0e8; text-align: left; }
    th { color: #66758a; background: #f6f8fa; font-size: 9px; text-transform: uppercase; }
    .number { text-align: right; font-variant-numeric: tabular-nums; }
    footer { display: flex; justify-content: flex-end; align-items: flex-start; gap: 24px; margin-top: 24px; }
    .notes { display: grid; flex: 1; gap: 6px; margin: 0; line-height: 1.5; }
    .total { display: grid; min-width: 180px; gap: 6px; padding: 14px; border: 1px solid #c8d1dc; text-align: right; }
    .total strong { font-size: 20px; }
  `
};

export const defaultDocumentTemplates = [defaultDocumentTemplateV1, defaultDocumentTemplateV2] as const;
export const defaultDocumentTemplate = defaultDocumentTemplateV2;
