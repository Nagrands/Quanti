import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { PaymentsPage } from "../src/features/payments/PaymentsPage";
import * as api from "../src/features/payments/payments-api";
import { allocatedTotal, createPaymentNumber, toPaymentPayload } from "../src/features/payments/payment-model";
import { renderWithAppProviders } from "./render-app";

vi.mock("../src/features/payments/payments-api");
const draft = { id: "pay-1", number: "PAY-1", direction: "INCOMING" as const, status: "DRAFT" as const, paymentDate: "2026-06-06T00:00:00.000Z", amount: "100.00", notes: null, accountId: "a1", counterpartyId: "c1", allocations: [{ documentId: "d1", amount: "40.00" }] };
const posted = { ...draft, id: "pay-2", number: "PAY-2", status: "POSTED" as const };
const lookups = {
  accounts: [{ id: "a1", code: "BANK", name: "Bank", type: "BANK" as const, currencyCode: "RUB", isActive: true, createdAt: "", updatedAt: "" }],
  counterparties: [{ id: "c1", code: "C1", name: "Acme", type: "CUSTOMER" as const, taxId: null, isActive: true, createdAt: "", updatedAt: "" }],
  documents: [{ id: "d1", number: "SO-1", type: "SALE" as const, status: "POSTED" as const, documentDate: "", postedAt: "", notes: null, totalAmount: "80.00", warehouseId: null, sourceWarehouseId: null, destinationWarehouseId: null, counterpartyId: "c1", items: [] }]
};

describe("payments workspace", () => {
  beforeEach(() => {
    vi.mocked(api.getPayments).mockResolvedValue([draft, posted]);
    vi.mocked(api.getPaymentLookups).mockResolvedValue(lookups);
    vi.mocked(api.getPaymentDebts).mockResolvedValue([{ counterpartyId: "c1", documentTotal: "80.00", paidTotal: "40.00", debtTotal: "40.00" }]);
    vi.mocked(api.createPayment).mockResolvedValue(draft); vi.mocked(api.updatePayment).mockResolvedValue(draft);
    vi.mocked(api.deletePayment).mockResolvedValue(undefined); vi.mocked(api.postPayment).mockResolvedValue(posted);
    vi.mocked(api.unpostPayment).mockResolvedValue(draft); vi.mocked(api.repostPayment).mockResolvedValue(posted);
  });

  test("filters payments and opens posted read-only", async () => {
    const user = userEvent.setup(); renderWithAppProviders(<PaymentsPage />, "/payments");
    expect(await screen.findByText("PAY-1")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Фильтр по статусу платежа"), "POSTED");
    expect(screen.queryByText("PAY-1")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Открыть" }));
    expect(within(screen.getByRole("complementary", { name: "Платёж" })).queryByRole("button", { name: "Сохранить черновик" })).not.toBeInTheDocument();
  });

  test("creates an outgoing partial payment allocation", async () => {
    const user = userEvent.setup(); renderWithAppProviders(<PaymentsPage />, "/payments"); await screen.findByText("PAY-1");
    await user.click(screen.getByRole("button", { name: "Новый платёж" }));
    const drawer = screen.getByRole("complementary", { name: "Новый платёж" });
    expect(within(drawer).getByLabelText("Номер")).toHaveValue(createPaymentNumber([draft, posted], new Date().toISOString().slice(0, 10)));
    await user.selectOptions(within(drawer).getByLabelText("Направление"), "OUTGOING");
    await user.selectOptions(within(drawer).getByLabelText("Счёт"), "a1");
    await user.selectOptions(within(drawer).getByLabelText("Контрагент"), "c1");
    const amount = within(drawer).getByLabelText("Сумма"); await user.clear(amount); await user.type(amount, "100");
    await user.click(within(drawer).getByRole("button", { name: "Добавить распределение" }));
    await user.selectOptions(within(drawer).getByLabelText("Документ распределения"), "d1");
    const allocated = within(drawer).getByLabelText("Сумма распределения"); await user.clear(allocated); await user.type(allocated, "40");
    await user.click(within(drawer).getByRole("button", { name: "Сохранить черновик" }));
    expect(api.createPayment).toHaveBeenCalledWith(expect.objectContaining({ direction: "OUTGOING", amount: "100.00", allocations: [{ documentId: "d1", amount: "40.00" }] }));
  });

  test("updates an untouched automatic number when the payment month changes", async () => {
    const user = userEvent.setup(); renderWithAppProviders(<PaymentsPage />, "/payments"); await screen.findByText("PAY-1");
    await user.click(screen.getByRole("button", { name: "Новый платёж" }));
    const drawer = screen.getByRole("complementary", { name: "Новый платёж" });
    await user.clear(within(drawer).getByLabelText("Дата платежа"));
    await user.type(within(drawer).getByLabelText("Дата платежа"), "2026-12-05");
    expect(within(drawer).getByLabelText("Номер")).toHaveValue("PAY-202612-0001");
  });

  test("does not replace a manually edited number when the payment month changes", async () => {
    const user = userEvent.setup(); renderWithAppProviders(<PaymentsPage />, "/payments"); await screen.findByText("PAY-1");
    await user.click(screen.getByRole("button", { name: "Новый платёж" }));
    const drawer = screen.getByRole("complementary", { name: "Новый платёж" });
    const number = within(drawer).getByLabelText("Номер");
    await user.clear(number); await user.type(number, "MANUAL-7");
    await user.clear(within(drawer).getByLabelText("Дата платежа"));
    await user.type(within(drawer).getByLabelText("Дата платежа"), "2026-12-05");
    expect(number).toHaveValue("MANUAL-7");
  });

  test("increments only matching monthly automatic payment numbers", () => {
    expect(createPaymentNumber([
      { number: "PAY-202612-0002" },
      { number: "PAY-202612-0010" },
      { number: "PAY-202611-0099" },
      { number: "PAY-202612-CUSTOM" }
    ], "2026-12-05")).toBe("PAY-202612-0011");
  });

  test("rejects allocations above the payment amount", async () => {
    const user = userEvent.setup(); renderWithAppProviders(<PaymentsPage />, "/payments"); await screen.findByText("PAY-1");
    await user.click(screen.getByRole("button", { name: "Изменить" }));
    const drawer = screen.getByRole("complementary", { name: "Платёж" });
    const allocated = within(drawer).getByLabelText("Сумма распределения");
    await user.clear(allocated); await user.type(allocated, "101");
    await user.click(within(drawer).getByRole("button", { name: "Сохранить черновик" }));
    expect(within(drawer).getByRole("alert")).toHaveTextContent("Распределённая сумма не может превышать сумму платежа.");
    expect(api.updatePayment).not.toHaveBeenCalled();
  });

  test("confirms unposting a posted payment", async () => {
    const user = userEvent.setup(); renderWithAppProviders(<PaymentsPage />, "/payments"); await screen.findByText("PAY-2");
    await user.click(screen.getByRole("button", { name: "Отменить проведение" }));
    await user.click(within(screen.getByRole("dialog", { name: "Отменить проведение платежа?" })).getByRole("button", { name: "Подтвердить" }));
    expect(api.unpostPayment).toHaveBeenCalledWith("pay-2");
  });

  test("normalizes payment payload totals", () => {
    const values = { number: " P1 ", direction: "OUTGOING" as const, paymentDate: "2026-06-06", amount: "100", accountId: "a1", counterpartyId: "", notes: "", allocations: [{ key: "x", documentId: "d1", amount: "30" }] };
    expect(allocatedTotal(values)).toBe(30);
    expect(toPaymentPayload(values)).toEqual(expect.objectContaining({ number: "P1", amount: "100.00", allocations: [{ documentId: "d1", amount: "30.00" }] }));
  });
});
