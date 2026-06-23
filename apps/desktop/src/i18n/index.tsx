import type {
  DocumentStatus,
  DocumentType,
  PaymentDirection,
  PaymentStatus,
  ProductDto,
  WarehouseDto
} from "@quanti/shared";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { ApiError } from "../api/errors";

export type Locale = "ru" | "en";
export type Translate = (text: string, values?: Record<string, string | number>) => string;

const STORAGE_KEY = "quanti.locale";

function getStoredLocale() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeLocale(locale: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Persistence is optional in restricted browser environments.
  }
}

const english: Record<string, string> = {
  "Главная": "Dashboard",
  "Справочники": "Master data",
  "Документы": "Documents",
  "Платежи": "Payments",
  "Отчёты": "Reports",
  "Настройки": "Settings",
  "Страница не найдена": "Page not found",
  "Основная навигация": "Primary navigation",
  "Закрыть навигацию": "Close navigation",
  "Открыть навигацию": "Open navigation",
  "Версия 0.1": "Version 0.1",
  "Подключение к API": "Connecting to API",
  "API недоступен": "API unavailable",
  "API подключён": "API connected",
  "Обзор": "Overview",
  "Рабочее пространство ERP": "ERP workspace",
  "Выберите раздел в меню, чтобы начать работу.": "Choose a section from the menu to get started.",
  "Загрузка главной…": "Loading dashboard…",
  "Не удалось загрузить главную": "Unable to load dashboard",
  "Быстрые действия": "Quick actions",
  "Создать продажу": "Create sale",
  "Создать закупку": "Create purchase",
  "Создать платёж": "Create payment",
  "Создать товар": "Create product",
  "Ключевые показатели": "Key metrics",
  "Продажи за месяц": "Monthly sales",
  "Входящие оплаты за месяц": "Monthly incoming payments",
  "Открытая задолженность": "Open debt",
  "Черновики документов": "Draft documents",
  "Последние документы": "Recent documents",
  "Последние платежи": "Recent payments",
  "Низкие остатки": "Low stock",
  "Документов пока нет": "No documents yet",
  "Платежей пока нет": "No payments yet",
  "Критичных остатков нет": "No critical stock levels",
  "Открытых долгов нет": "No open debts",
  "Раздел": "Section",
  "Такого раздела не существует": "This section does not exist",
  "Используйте основное меню или вернитесь на главную страницу.": "Use the main menu or return to the dashboard.",
  "Вернуться на главную": "Return to Dashboard",
  "Параметры приложения и рабочего пространства.": "Application and workspace preferences.",
  "Язык интерфейса": "Interface language",
  "Русский": "Russian",
  "Английский": "English",
  "Язык применяется сразу и сохраняется для следующих запусков.": "The language is applied immediately and saved for future launches.",
  "Операции": "Operations",
  "Финансы": "Finance",
  "Создать": "Create",
  "Сохранить": "Save",
  "Сохранение…": "Saving…",
  "Отмена": "Cancel",
  "Повторить": "Retry",
  "Изменить": "Edit",
  "Открыть": "View",
  "Удалить": "Delete",
  "Провести": "Post",
  "Перепровести": "Repost",
  "Отменить проведение": "Unpost",
  "Выполнение…": "Processing…",
  "Подтвердить": "Confirm",
  "Действия": "Actions",
  "Загрузка…": "Loading…",
  "Номер": "Number",
  "Тип": "Type",
  "Дата": "Date",
  "Сумма": "Amount",
  "Статус": "Status",
  "Комментарий": "Notes",
  "Товар": "Product",
  "Товары": "Products",
  "Количество": "Quantity",
  "Цена": "Price",
  "Итого": "Total",
  "Склад": "Warehouse",
  "Контрагент": "Counterparty",
  "Счёт": "Account",
  "Черновик": "Draft",
  "Проведён": "Posted",
  "Отменён": "Cancelled",
  "Продажа": "Sale",
  "Закупка": "Purchase",
  "Перемещение": "Transfer",
  "Корректировка остатков": "Stock adjustment",
  "Возврат от покупателя": "Customer return",
  "Возврат поставщику": "Supplier return",
  "Входящий": "Incoming",
  "Исходящий": "Outgoing",
  "Входящие": "Incoming",
  "Исходящие": "Outgoing",
  "Провести документ?": "Post document?",
  "Отменить проведение?": "Unpost document?",
  "Перепровести документ?": "Repost document?",
  "Удалить документ?": "Delete document?",
  "Провести платёж?": "Post payment?",
  "Отменить проведение платежа?": "Unpost payment?",
  "Перепровести платёж?": "Repost payment?",
  "Удалить платёж?": "Delete payment?",
  "Не удалось выполнить операцию": "Operation failed",
  "Новый документ": "New document",
  "Документ": "Document",
  "Новый черновик": "New draft",
  "Закрыть документ": "Close document",
  "Дата документа": "Document date",
  "Без контрагента": "No counterparty",
  "Склад-отправитель": "Source warehouse",
  "Склад-получатель": "Destination warehouse",
  "Выберите склад": "Select warehouse",
  "Выберите товар": "Select product",
  "Найти товар по названию или SKU": "Find product by name or SKU",
  "Результаты поиска товаров": "Product search results",
  "Товары не найдены": "No products found",
  "Создать новый товар": "Create new product",
  "Быстрое создание": "Quick create",
  "Новый товар": "New product",
  "Заполните SKU, наименование и единицу измерения.": "Enter SKU, name, and unit.",
  "Создать и выбрать": "Create and select",
  "Недоступен: {id}": "Unavailable: {id}",
  "Удалить строку": "Delete line",
  "Добавить товар": "Add product",
  "Сохранить черновик": "Save draft",
  "Проведение корректировки остатков пока не поддерживается.": "Posting stock adjustments is not supported yet.",
  "Заполните обязательные поля. Количество должно быть положительным, а цена — корректной.": "Complete the required fields. Quantity must be positive and price must be valid.",
  "Для перемещения укажите склад-отправитель и склад-получатель.": "Select source and destination warehouses for the transfer.",
  "Склад-отправитель и склад-получатель должны отличаться.": "Source and destination warehouses must be different.",
  "Выберите склад для документа.": "Select a warehouse for the document.",
  "Недостаточно остатков для проведения": "Insufficient stock for posting",
  "{product} на складе {warehouse}: доступно {available}, требуется {required}.": "{product} in {warehouse}: available {available}, required {required}.",
  "Поиск документов": "Search documents",
  "Фильтр по статусу": "Status filter",
  "Фильтр по типу": "Type filter",
  "Все статусы": "All statuses",
  "Все типы": "All types",
  "Загрузка документов…": "Loading documents…",
  "Не удалось загрузить документы.": "Unable to load documents.",
  "Документы не найдены": "No documents found",
  "Создайте черновик или измените фильтры.": "Create a draft or adjust the filters.",
  "Позиций": "Items",
  "Формирование…": "Generating…",
  "Печать": "Print",
  "Операция изменит документ {number} и связанные движения учёта.": "This operation will update document {number} and its ledger movements.",
  "Предварительный просмотр движений": "Movement preview",
  "Будут созданы складские движения": "Stock movements will be created",
  "Не удалось сохранить PDF.": "Unable to save PDF.",
  "Разделы справочников": "Master data sections",
  "Поиск товаров": "Search products",
  "Поиск категорий": "Search categories",
  "Поиск складов": "Search warehouses",
  "Поиск контрагентов": "Search counterparties",
  "Поиск счетов": "Search accounts",
  "Сводка справочника": "Master data summary",
  "Всего": "Total",
  "Активные": "Active",
  "Архивные": "Archived",
  "Показано": "Shown",
  "Фильтр активности": "Activity filter",
  "Только активные": "Active only",
  "Только архивные": "Archived only",
  "Все записи": "All records",
  "Активна": "Active",
  "Архив": "Archive",
  "Не удалось загрузить данные.": "Unable to load data.",
  "Совпадений не найдено": "No matching records",
  "Записей пока нет": "No records yet",
  "Архивных записей нет": "No archived records",
  "Активных записей нет": "No active records",
  "Измените поисковый запрос.": "Adjust the search query.",
  "Измените поисковый запрос или фильтр активности.": "Adjust the search query or activity filter.",
  "Деактивированные записи появятся здесь.": "Deactivated records will appear here.",
  "Переключите фильтр на все записи или создайте новую активную запись.": "Switch the filter to all records or create a new active record.",
  "Создайте первую запись, чтобы начать работу.": "Create the first record to get started.",
  "Изменить {name}": "Edit {name}",
  "Деактивировать {name}": "Deactivate {name}",
  "Восстановить {name}": "Restore {name}",
  "Деактивировать запись?": "Deactivate record?",
  "{name} исчезнет из активных списков. Восстановление через интерфейс пока не поддерживается.": "{name} will disappear from active lists. Restoring it through the interface is not supported yet.",
  "{name} исчезнет из активных списков. Запись можно будет восстановить из архива.": "{name} will disappear from active lists. You can restore the record from the archive.",
  "Деактивация…": "Deactivating…",
  "Деактивировать": "Deactivate",
  "Восстановить запись?": "Restore record?",
  "{name} вернётся в активные списки и снова будет доступен для новых операций.": "{name} will return to active lists and become available for new operations again.",
  "Восстановление…": "Restoring…",
  "Восстановить": "Restore",
  "Изменение записи": "Edit record",
  "Новая запись": "New record",
  "Создание записи": "Create record",
  "Изменить: {name}": "Edit: {name}",
  "Новый {name}": "New {name}",
  "Закрыть форму": "Close form",
  "Поле «{field}» обязательно.": "{field} is required.",
  "Код валюты должен состоять из трёх букв.": "Currency code must contain three letters.",
  "Наименование": "Name",
  "Категория": "Category",
  "Категории товаров": "Product categories",
  "Без категории": "No category",
  "Единица": "Unit",
  "шт, кг, л": "pcs, kg, l",
  "Описание": "Description",
  "Изменено": "Updated",
  "Код": "Code",
  "ИНН": "Tax ID",
  "Валюта": "Currency",
  "Покупатель": "Customer",
  "Поставщик": "Supplier",
  "Покупатель и поставщик": "Customer and supplier",
  "Внутренний": "Internal",
  "Наличные": "Cash",
  "Банк": "Bank",
  "товар": "product",
  "категорию": "category",
  "склад": "warehouse",
  "контрагента": "counterparty",
  "счёт": "account",
  "Поиск платежей": "Search payments",
  "Фильтр по направлению": "Direction filter",
  "Фильтр по статусу платежа": "Payment status filter",
  "Все направления": "All directions",
  "Новый платёж": "New payment",
  "Загрузка платежей…": "Loading payments…",
  "Не удалось загрузить платежи.": "Unable to load payments.",
  "Платежи не найдены": "No payments found",
  "Направление": "Direction",
  "Распределено": "Allocated",
  "Платёж": "Payment",
  "Закрыть платёж": "Close payment",
  "Дата платежа": "Payment date",
  "Выберите счёт": "Select account",
  "Счёт недоступен": "Account unavailable",
  "Контрагент недоступен": "Counterparty unavailable",
  "Распределение оплаты": "Payment allocation",
  "Сумма документа": "Document amount",
  "Сумма оплаты": "Allocated amount",
  "Документ распределения": "Allocation document",
  "Выберите документ": "Select document",
  "Документ недоступен": "Document unavailable",
  "Сумма распределения": "Allocate amount",
  "Удалить распределение": "Delete allocation",
  "Добавить распределение": "Add allocation",
  "Сумма платежа": "Payment amount",
  "Не распределено": "Unallocated",
  "Задолженность контрагента: {debt} (документы: {documents}, оплачено: {paid})": "Counterparty debt: {debt} (documents: {documents}, paid: {paid})",
  "Заполните обязательные поля и укажите положительную сумму платежа.": "Complete the required fields and enter a positive payment amount.",
  "Для распределения выберите уникальные документы и положительные суммы.": "Select unique documents and positive allocation amounts.",
  "Распределённая сумма не может превышать сумму платежа.": "Allocated amount cannot exceed payment amount.",
  "Операция изменит платёж {number} и связанные движения денежных средств.": "This operation will update payment {number} and related money movements.",
  "Тип отчёта": "Report type",
  "Остатки на складе": "Stock balance",
  "Обороты товаров": "Stock turnover",
  "Остаток на дату": "Balance at date",
  "Продажи": "Sales",
  "Популярные товары": "Top products",
  "Движение денег": "Cashflow",
  "Долги контрагентов": "Counterparty debts",
  "Приход": "Incoming",
  "Расход": "Outgoing",
  "Дата движения": "Movement date",
  "Сумма документов": "Document total",
  "Оплачено": "Paid",
  "Задолженность": "Debt",
  "Дата с": "From date",
  "Дата по": "To date",
  "Проведено с": "Posted from",
  "Проведено по": "Posted to",
  "На дату": "At date",
  "На дату (необязательно)": "At date (optional)",
  "Все склады": "All warehouses",
  "Все товары": "All products",
  "Все счета": "All accounts",
  "Все контрагенты": "All counterparties",
  "Лимит": "Limit",
  "Сформировать": "Run report",
  "Экспорт CSV": "Export CSV",
  "Загрузка отчёта…": "Loading report…",
  "Не удалось загрузить отчёт.": "Unable to load report.",
  "Нет данных": "No report data",
  "Измените фильтры и сформируйте отчёт повторно.": "Adjust the filters and run the report again.",
  "Укажите корректный период.": "Choose a valid date range.",
  "Укажите дату отчёта.": "Choose a report date.",
  "Лимит должен быть положительным целым числом.": "Limit must be a positive integer."
};

function interpolate(text: string, values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    text
  );
}

interface ErrorContext {
  products?: ProductDto[];
  warehouses?: WarehouseDto[];
}

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
  documentTypeLabels: Record<DocumentType, string>;
  documentStatusLabels: Record<DocumentStatus, string>;
  paymentStatusLabels: Record<PaymentStatus, string>;
  paymentDirectionLabels: Record<PaymentDirection, string>;
  formatDate: (value: string) => string;
  formatDateTime: (value: string) => string;
  formatApiError: (error: unknown, context?: ErrorContext) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function detail(error: ApiError, key: string) {
  const value = error.details?.[key];
  return typeof value === "string" ? value : "";
}

export function formatApiErrorForLocale(
  locale: Locale,
  error: unknown,
  context: ErrorContext = {}
) {
  if (!(error instanceof ApiError)) {
    return locale === "ru"
      ? "Не удалось выполнить операцию. Повторите попытку."
      : "Unable to complete the operation. Try again.";
  }
  if (error.code === "INSUFFICIENT_STOCK") {
    const product = context.products?.find((item) => item.id === detail(error, "productId"));
    const warehouse = context.warehouses?.find((item) => item.id === detail(error, "warehouseId"));
    const productName = product ? `${product.sku} · ${product.name}` : locale === "ru" ? "выбранного товара" : "the selected product";
    const warehouseName = warehouse ? `${warehouse.code} · ${warehouse.name}` : locale === "ru" ? "выбранном складе" : "the selected warehouse";
    const available = detail(error, "availableQuantity") || "0";
    const required = detail(error, "requiredQuantity") || "—";
    return locale === "ru"
      ? `Недостаточно товара «${productName}» на складе «${warehouseName}». Доступно: ${available}, требуется: ${required}. Сначала проведите поступление или уменьшите количество продажи.`
      : `Insufficient stock for “${productName}” in “${warehouseName}”. Available: ${available}, required: ${required}. Post a purchase first or reduce the sale quantity.`;
  }
  const messages = locale === "ru" ? {
    NETWORK_ERROR: "Нет соединения с API. Проверьте, что сервер Quanti запущен.",
    DATABASE_UNAVAILABLE: "База данных недоступна. Проверьте PostgreSQL и повторите попытку.",
    INTERNAL_ERROR: "Внутренняя ошибка сервера. Повторите попытку или проверьте журнал API.",
    CONFLICT: "Запись с такими уникальными данными уже существует.",
    VALIDATION_ERROR: "Проверьте заполнение обязательных полей.",
    NOT_FOUND: "Запрошенная запись не найдена."
  } : {
    NETWORK_ERROR: "Cannot connect to the API. Check that the Quanti server is running.",
    DATABASE_UNAVAILABLE: "The database is unavailable. Check PostgreSQL and try again.",
    INTERNAL_ERROR: "Internal server error. Try again or check the API logs.",
    CONFLICT: "A record with the same unique data already exists.",
    VALIDATION_ERROR: "Check the required fields.",
    NOT_FOUND: "The requested record was not found."
  };
  return messages[error.code as keyof typeof messages] ?? error.message;
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>(() => getStoredLocale() === "en" ? "en" : "ru");
  const t = useMemo<Translate>(() => (text, values) =>
    interpolate(locale === "en" ? english[text] ?? text : text, values), [locale]);

  useEffect(() => {
    storeLocale(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const documentTypeLabels: Record<DocumentType, string> = {
      SALE: t("Продажа"),
      PURCHASE: t("Закупка"),
      TRANSFER: t("Перемещение"),
      STOCK_ADJUSTMENT: t("Корректировка остатков"),
      RETURN_IN: t("Возврат от покупателя"),
      RETURN_OUT: t("Возврат поставщику")
    };
    const documentStatusLabels: Record<DocumentStatus, string> = {
      DRAFT: t("Черновик"),
      POSTED: t("Проведён")
    };
    const paymentStatusLabels: Record<PaymentStatus, string> = {
      DRAFT: t("Черновик"),
      POSTED: t("Проведён"),
      CANCELLED: t("Отменён")
    };
    const paymentDirectionLabels: Record<PaymentDirection, string> = {
      INCOMING: t("Входящий"),
      OUTGOING: t("Исходящий")
    };
    return {
      locale,
      setLocale: setLocaleState,
      t,
      documentTypeLabels,
      documentStatusLabels,
      paymentStatusLabels,
      paymentDirectionLabels,
      formatDate: (date) => new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US").format(new Date(date)),
      formatDateTime: (date) => new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(date)),
      formatApiError: (error, context) => formatApiErrorForLocale(locale, error, context)
    };
  }, [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within I18nProvider.");
  return value;
}
