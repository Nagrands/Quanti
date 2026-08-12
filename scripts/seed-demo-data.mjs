const apiBaseUrl = (process.env.QUANTI_API_BASE_URL ?? "http://localhost:3100").replace(/\/+$/, "");
const sessionToken = process.env.QUANTI_SESSION_TOKEN?.trim();

async function request(path, init) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...init?.headers
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    const message = body?.error?.message;
    throw new Error(
      Array.isArray(message)
        ? message.join(", ")
        : message ?? `${init?.method ?? "GET"} ${path} failed with status ${response.status}.`
    );
  }

  return response.status === 204 ? undefined : response.json();
}

async function findOrCreate(path, predicate, payload) {
  const existing = (await request(path)).find(predicate);
  return existing ?? request(path, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function ensurePostedDocument(number, payload, postedAt) {
  let document = (await request("/documents")).find((candidate) => candidate.number === number);

  if (!document) {
    document = await request("/documents", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  if (document.status === "DRAFT") {
    document = await request(`/documents/${document.id}/post`, {
      method: "POST",
      body: JSON.stringify({ postedAt })
    });
  }

  return document;
}

async function ensurePostedPayment(number, payload, postedAt) {
  let payment = (await request("/payments")).find((candidate) => candidate.number === number);

  if (!payment) {
    payment = await request("/payments", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  if (payment.status === "DRAFT") {
    payment = await request(`/payments/${payment.id}/post`, {
      method: "POST",
      body: JSON.stringify({ postedAt })
    });
  }

  return payment;
}

async function main() {
  try {
    await request("/health");
  } catch (error) {
    console.error(`Quanti API is unavailable at ${apiBaseUrl}. Start it with "pnpm dev:api".`);
    throw error;
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const period = `${year}${month}`;
  const purchaseDate = `${year}-${month}-01T09:00:00.000Z`;
  const saleDate = `${year}-${month}-${day}T12:00:00.000Z`;
  const paymentDate = `${year}-${month}-${day}T13:00:00.000Z`;
  const reportFrom = `${year}-${month}-01T00:00:00.000Z`;
  const reportTo = `${year}-${month}-${day}T23:59:59.999Z`;

  const product = await findOrCreate(
    "/products",
    (candidate) => candidate.sku === "DEMO-001",
    {
      sku: "DEMO-001",
      name: "Demo product",
      description: "Sample item for the Quanti release workflow.",
      unit: "pcs"
    }
  );
  const warehouse = await findOrCreate(
    "/warehouses",
    (candidate) => candidate.code === "MAIN",
    { code: "MAIN", name: "Main warehouse" }
  );
  const customer = await findOrCreate(
    "/counterparties",
    (candidate) => candidate.code === "DEMO-CUSTOMER",
    {
      code: "DEMO-CUSTOMER",
      name: "Demo customer",
      type: "CUSTOMER",
      taxId: "7700000000"
    }
  );
  const supplier = await findOrCreate(
    "/counterparties",
    (candidate) => candidate.code === "DEMO-SUPPLIER",
    {
      code: "DEMO-SUPPLIER",
      name: "Demo supplier",
      type: "SUPPLIER",
      taxId: "7800000000"
    }
  );
  const account = await findOrCreate(
    "/accounts",
    (candidate) => candidate.code === "MAIN-BANK",
    {
      code: "MAIN-BANK",
      name: "Main bank account",
      type: "BANK",
      currencyCode: "RUB"
    }
  );

  await ensurePostedDocument(`DEMO-PURCHASE-${period}`, {
    number: `DEMO-PURCHASE-${period}`,
    type: "PURCHASE",
    documentDate: purchaseDate,
    destinationWarehouseId: warehouse.id,
    counterpartyId: supplier.id,
    notes: "Demo opening stock",
    items: [{
      productId: product.id,
      quantity: "10.000",
      price: "100.00",
      amount: "1000.00",
      warehouseId: warehouse.id
    }]
  }, purchaseDate);

  const sale = await ensurePostedDocument(`DEMO-SALE-${period}`, {
    number: `DEMO-SALE-${period}`,
    type: "SALE",
    documentDate: saleDate,
    sourceWarehouseId: warehouse.id,
    counterpartyId: customer.id,
    notes: "Demo customer sale",
    items: [{
      productId: product.id,
      quantity: "2.000",
      price: "150.00",
      amount: "300.00",
      warehouseId: warehouse.id
    }]
  }, saleDate);

  await ensurePostedPayment(`DEMO-PAYMENT-${period}`, {
    number: `DEMO-PAYMENT-${period}`,
    direction: "INCOMING",
    paymentDate,
    amount: "200.00",
    accountId: account.id,
    counterpartyId: customer.id,
    notes: "Demo partial payment",
    allocations: [{
      documentId: sale.id,
      amount: "200.00"
    }]
  }, paymentDate);

  const balance = await request(
    `/stock/balance?productId=${encodeURIComponent(product.id)}&warehouseId=${encodeURIComponent(warehouse.id)}`
  );
  if (balance.quantity !== "8.000") {
    throw new Error(`Expected demo stock balance 8.000, received ${balance.quantity}.`);
  }

  const debts = await request(
    `/reports/counterparty-debts?at=${encodeURIComponent(reportTo)}&counterpartyId=${encodeURIComponent(customer.id)}`
  );
  if (debts.length !== 1 || Number(debts[0].debtTotal) !== 100) {
    throw new Error(`Expected demo customer debt 100.00, received ${JSON.stringify(debts)}.`);
  }

  const sales = await request(
    `/reports/sales?from=${encodeURIComponent(reportFrom)}&to=${encodeURIComponent(reportTo)}&counterpartyId=${encodeURIComponent(customer.id)}`
  );
  if (!sales.some((row) => row.documentId === sale.id && Number(row.amount) === 300)) {
    throw new Error("Demo sale is missing from the current-period sales report.");
  }

  const cashflow = await request(
    `/reports/cashflow?from=${encodeURIComponent(reportFrom)}&to=${encodeURIComponent(reportTo)}&accountId=${encodeURIComponent(account.id)}`
  );
  if (!cashflow.some((row) => Number(row.incoming) === 200)) {
    throw new Error("Demo payment is missing from the current-period cashflow report.");
  }

  console.log(
    `Demo data for ${year}-${month} is ready: stock 8.000, customer debt 100.00, sale 300.00, payment 200.00.`
  );
}

await main();
