import type { ProductDto } from "@quanti/shared";

export type PurchaseImportStatus = "ready" | "unmatched" | "ambiguous" | "missing-quantity" | "invalid-unit";

export interface PurchaseImportRow {
  key: string;
  source: string;
  productQuery: string;
  productId: string;
  quantity: string;
  unit: string;
  status: PurchaseImportStatus;
  candidateIds: string[];
  rememberAlias: boolean;
}

const unitKinds = {
  kg: /^(?:кг|килограмм(?:а|ов)?|килограмма)$/i,
  gram: /^(?:г|гр|грамм(?:а|ов)?)$/i,
  pieces: /^(?:шт|штук(?:а|и)?|штука|штуки|голов(?:а|ы)?)$/i,
  bunches: /^(?:пуч|пучок|пучка|пучков|пучка небольшой)$/i
};

export function normalizeProductText(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(left: string, right: string) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const current = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
      previous = current;
    }
  }
  return row[right.length];
}

function tokenScore(query: string, candidate: string) {
  if (query === candidate) return 1;
  const stem = (value: string) => value
    .replace(/ец$/u, "ц")
    .replace(/(?:ы|и|а|я|о|е)$/u, "");
  if (stem(query) === stem(candidate)) return 0.96;
  if (query.length >= 4 && (query.startsWith(candidate) || candidate.startsWith(query))) return 0.92;
  const distance = levenshtein(query, candidate);
  return 1 - distance / Math.max(query.length, candidate.length, 1);
}

function nameScore(query: string, candidate: string) {
  if (query === candidate) return 1;
  const queryTokens = query.split(" ");
  const candidateTokens = candidate.split(" ");
  const scores = queryTokens.map((token) => Math.max(...candidateTokens.map((other) => tokenScore(token, other))));
  return scores.every((score) => score >= 0.72)
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      - Math.max(0, candidateTokens.length - queryTokens.length) * 0.08
    : 0;
}

export function matchProduct(query: string, products: ProductDto[]) {
  const normalized = normalizeProductText(query);
  const scored = products.map((product) => {
    const names = [product.name, ...(product.aliases ?? [])].map(normalizeProductText);
    return { product, score: Math.max(...names.map((name) => nameScore(normalized, name))) };
  }).filter((candidate) => candidate.score >= 0.78)
    .sort((left, right) => right.score - left.score);
  if (!scored.length) return { productId: "", candidateIds: [] as string[], status: "unmatched" as const };
  const best = scored[0];
  const tied = scored.filter((candidate) => best.score - candidate.score < 0.05);
  return tied.length === 1
    ? { productId: best.product.id, candidateIds: [best.product.id], status: "ready" as const }
    : { productId: "", candidateIds: tied.map((candidate) => candidate.product.id), status: "ambiguous" as const };
}

function splitEntries(text: string) {
  return text.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || /^заявка\s*\d*/i.test(trimmed)) return [];
    const protectedDecimals = trimmed.replace(/(\d),(\d)/g, "$1§$2");
    return protectedDecimals.split(/[,;]+/).map((entry) => entry.replace(/§/g, ",").trim()).filter(Boolean);
  });
}

function parseEntry(source: string) {
  const normalized = source.replace(/[.]$/g, "").replace(/\s+-\s+/g, " ").trim();
  const match = /^(.*?)(?:\s+)(\d+(?:[.,]\d+)?)\s*([\p{L}]+(?:\s+небольшой)?)?$/iu.exec(normalized);
  return match
    ? { productQuery: match[1].trim(), quantity: match[2].replace(",", "."), rawUnit: match[3]?.trim() ?? "" }
    : { productQuery: normalized, quantity: "", rawUnit: "" };
}

function compatibleUnit(product: ProductDto, rawUnit: string, quantity: string) {
  if (!rawUnit) return { unit: product.unit, quantity };
  const available = [product.unit, ...product.units.map((unit) => unit.name)];
  if (unitKinds.gram.test(rawUnit)) {
    const kg = available.find((unit) => unitKinds.kg.test(unit));
    return kg ? { unit: kg, quantity: (Number(quantity) / 1000).toString() } : null;
  }
  const kind = unitKinds.kg.test(rawUnit) ? unitKinds.kg
    : unitKinds.pieces.test(rawUnit) ? unitKinds.pieces
      : unitKinds.bunches.test(rawUnit) ? unitKinds.bunches
        : null;
  if (!kind) return null;
  const unit = available.find((candidate) => kind.test(candidate));
  return unit ? { unit, quantity } : null;
}

export function resolvePurchaseRow(row: PurchaseImportRow, products: ProductDto[]): PurchaseImportRow {
  const product = products.find((candidate) => candidate.id === row.productId);
  if (!row.quantity || Number(row.quantity) <= 0) return { ...row, status: "missing-quantity" };
  if (!product) return { ...row, status: row.candidateIds.length > 1 ? "ambiguous" : "unmatched" };
  const available = [product.unit, ...product.units.map((unit) => unit.name)];
  if (!available.includes(row.unit)) return { ...row, status: "invalid-unit" };
  return { ...row, status: "ready" };
}

export function parsePurchaseList(text: string, products: ProductDto[]): PurchaseImportRow[] {
  return splitEntries(text).map((source) => {
    const parsed = parseEntry(source);
    const matched = matchProduct(parsed.productQuery, products);
    const product = products.find((candidate) => candidate.id === matched.productId);
    const converted = product && parsed.quantity ? compatibleUnit(product, parsed.rawUnit, parsed.quantity) : null;
    const base: PurchaseImportRow = {
      key: crypto.randomUUID(), source, productQuery: parsed.productQuery,
      productId: matched.productId, quantity: converted?.quantity ?? parsed.quantity,
      unit: converted?.unit ?? product?.unit ?? "", candidateIds: matched.candidateIds,
      status: matched.status, rememberAlias: matched.status !== "ready"
    };
    if (!parsed.quantity) return { ...base, status: "missing-quantity" };
    if (product && parsed.rawUnit && !converted) return { ...base, status: "invalid-unit" };
    return resolvePurchaseRow(base, products);
  });
}

export function mergePurchaseRows(rows: PurchaseImportRow[]) {
  const merged = new Map<string, PurchaseImportRow>();
  for (const row of rows) {
    const mapKey = `${row.productId}:${row.unit}`;
    const existing = merged.get(mapKey);
    if (!existing) merged.set(mapKey, { ...row });
    else existing.quantity = (Number(existing.quantity) + Number(row.quantity)).toFixed(3).replace(/\.?0+$/, "");
  }
  return [...merged.values()];
}
