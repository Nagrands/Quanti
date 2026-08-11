import type { CreateProductDto, DocumentDto, DocumentStatus, DocumentType, ProductDto } from "@quanti/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardPaste, Eye, Pencil, Plus, Printer, RefreshCcw, Search, Trash2, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useI18n } from "../../i18n";
import { ActionIconButton } from "../../components/actions/ActionIconButton";
import { DataTransferControls } from "../transfer/DataTransferControls";
import { DocumentDrawer } from "./DocumentDrawer";
import {
  createDocument,
  createProduct,
  deleteDocument,
  downloadDocumentPdf,
  getDocumentLookups,
  getDocuments,
  postDocument,
  printDocument,
  repostDocument,
  unpostDocument,
  updateDocument,
  updateProductAliases
} from "./documents-api";
import { createImportedPurchase, type DocumentFormValues, toDocumentPayload } from "./document-model";
import { getDocumentMovementPreview } from "./document-preview";
import { PurchaseListImportDialog } from "./PurchaseListImportDialog";

type LifecycleAction = "post" | "unpost" | "repost" | "delete";

export function DocumentsPage() {
  const { documentStatusLabels, documentTypeLabels, formatApiError, formatDate, t } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | DocumentStatus>("");
  const [type, setType] = useState<"" | DocumentType>("");
  const [selected, setSelected] = useState<DocumentDto | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPurchaseImportOpen, setIsPurchaseImportOpen] = useState(false);
  const [importedValues, setImportedValues] = useState<DocumentFormValues | null>(null);
  const [pendingAction, setPendingAction] = useState<{ action: LifecycleAction; document: DocumentDto } | null>(null);
  const [printError, setPrintError] = useState("");

  const documentsQuery = useQuery({ queryKey: ["documents"], queryFn: getDocuments });
  const lookupsQuery = useQuery({ queryKey: ["document-lookups"], queryFn: getDocumentLookups });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["documents"] });

  const saveMutation = useMutation({
    mutationFn: ({ values, document }: { values: DocumentFormValues; document: DocumentDto | null }) =>
      document ? updateDocument(document.id, toDocumentPayload(values)) : createDocument(toDocumentPayload(values)),
    onSuccess: async (savedDocument) => {
      queryClient.setQueryData<DocumentDto[]>(["documents"], (current = []) => {
        const existingIndex = current.findIndex((item) => item.id === savedDocument.id);
        if (existingIndex === -1) {
          return [...current, savedDocument];
        }

        return current.map((item) => item.id === savedDocument.id ? savedDocument : item);
      });
      setIsDrawerOpen(false);
      setSelected(null);
    }
  });
  const createProductMutation = useMutation({
    mutationFn: (payload: CreateProductDto) => createProduct(payload),
    onSuccess: (product) => {
      queryClient.setQueryData<Awaited<ReturnType<typeof getDocumentLookups>>>(
        ["document-lookups"],
        (current) => current
          ? { ...current, products: [...current.products, product] }
          : { products: [product], categories: [], warehouses: [], counterparties: [] }
      );
    }
  });
  const aliasMutation = useMutation({
    mutationFn: ({ productId, aliases }: { productId: string; aliases: string[] }) => updateProductAliases(productId, aliases),
    onSuccess: (product) => {
      queryClient.setQueryData<Awaited<ReturnType<typeof getDocumentLookups>>>(["document-lookups"], (current) => current
        ? { ...current, products: current.products.map((candidate) => candidate.id === product.id ? product : candidate) }
        : current);
    }
  });

  const lifecycleMutation = useMutation<void, Error, { action: LifecycleAction; document: DocumentDto }>({
    mutationFn: async ({ action, document }) => {
      if (action === "post") await postDocument(document.id);
      else if (action === "unpost") await unpostDocument(document.id);
      else if (action === "repost") await repostDocument(document.id);
      else await deleteDocument(document.id);
    },
    onSuccess: async () => {
      await refresh();
      setPendingAction(null);
    }
  });
  const printMutation = useMutation({
    mutationFn: (id: string) => printDocument(id),
    onSuccess: async (result, id) => {
      const document = documentsQuery.data?.find((item) => item.id === id);
      try {
        await downloadDocumentPdf(
          result.data,
          result.fileName || `${document?.number ?? "document"}.pdf`
        );
        setPrintError("");
      } catch (error) {
        setPrintError(error instanceof Error ? error.message : t("Не удалось сохранить PDF."));
      }
    },
    onError: (error) => {
      setPrintError(formatApiError(error));
    }
  });

  const filtered = useMemo(() => (documentsQuery.data ?? []).filter((document) => {
    const text = search.trim().toLowerCase();
    return (!status || document.status === status)
      && (!type || document.type === type)
      && (!text || `${document.number} ${documentTypeLabels[document.type]}`.toLowerCase().includes(text));
  }), [documentTypeLabels, documentsQuery.data, search, status, type]);

  const lifecycleLabels = {
    post: { title: t("Провести документ?"), action: t("Провести") },
    unpost: { title: t("Отменить проведение?"), action: t("Отменить проведение") },
    repost: { title: t("Перепровести документ?"), action: t("Перепровести") },
    delete: { title: t("Удалить документ?"), action: t("Удалить") }
  };

  return (
    <section className="page documents-page" aria-labelledby="documents-title">
      <header className="page__header"><p className="page__eyebrow">{t("Операции")}</p><h1 id="documents-title">{t("Документы")}</h1></header>
      <div className="document-toolbar">
        <label className="search-field"><Search /><span className="visually-hidden">{t("Поиск документов")}</span><input type="search" placeholder={t("Поиск документов")} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <select aria-label={t("Фильтр по статусу")} value={status} onChange={(event) => setStatus(event.target.value as "" | DocumentStatus)}><option value="">{t("Все статусы")}</option><option value="DRAFT">{t("Черновик")}</option><option value="POSTED">{t("Проведён")}</option></select>
        <select aria-label={t("Фильтр по типу")} value={type} onChange={(event) => setType(event.target.value as "" | DocumentType)}><option value="">{t("Все типы")}</option>{Object.entries(documentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <div className="document-toolbar__actions">
          <DataTransferControls section="documents" onImported={() => queryClient.invalidateQueries()} />
          <button type="button" className="button button--secondary" onClick={() => setIsPurchaseImportOpen(true)}><ClipboardPaste /> {t("Импортировать список закупки")}</button>
          <button type="button" className="button button--primary" onClick={() => { setSelected(null); setImportedValues(null); setIsDrawerOpen(true); }}><Plus /> {t("Новый документ")}</button>
        </div>
      </div>
      {printError ? <div className="form-alert document-print-alert" role="alert">{printError}</div> : null}

      <div className="data-table-frame">
        {documentsQuery.isPending ? <div className="table-state">{t("Загрузка документов…")}</div>
          : documentsQuery.isError ? <div className="table-state table-state--error"><strong>{t("Не удалось загрузить документы.")}</strong><span>{formatApiError(documentsQuery.error)}</span><button className="button button--secondary" onClick={() => void documentsQuery.refetch()}>{t("Повторить")}</button></div>
          : filtered.length === 0 ? <div className="table-state"><strong>{t("Документы не найдены")}</strong><span>{t("Создайте черновик или измените фильтры.")}</span></div>
          : <div className="data-table-scroll"><table className="data-table documents-table"><thead><tr><th>{t("Номер")}</th><th>{t("Тип")}</th><th>{t("Дата")}</th><th>{t("Позиций")}</th><th>{t("Сумма")}</th><th>{t("Статус")}</th><th className="data-table__actions-heading">{t("Действия")}</th></tr></thead><tbody>
            {filtered.map((document) => <tr key={document.id}>
              <td><button className="table-link" onClick={() => { setSelected(document); setIsDrawerOpen(true); }}>{document.number}</button></td>
              <td>{documentTypeLabels[document.type]}</td><td>{formatDate(document.documentDate)}</td><td>{document.items.length}</td><td>{document.totalAmount}</td>
              <td><span className={`status-label status-label--${document.status.toLowerCase()}`}>{documentStatusLabels[document.status]}</span></td>
              <td className="data-table__actions-cell"><div className="document-actions">
                {document.status === "DRAFT" ? <>
                  <ActionIconButton label={t(document.type === "STOCK_ADJUSTMENT" ? "Открыть" : "Изменить")} icon={document.type === "STOCK_ADJUSTMENT" ? <Eye aria-hidden="true" /> : <Pencil aria-hidden="true" />} onClick={() => { setSelected(document); setIsDrawerOpen(true); }} />
                  {document.type !== "STOCK_ADJUSTMENT" ? <ActionIconButton tone="success" label={t("Провести")} icon={<CheckCircle2 aria-hidden="true" />} onClick={() => setPendingAction({ action: "post", document })} /> : null}
                  <ActionIconButton tone="danger" label={t("Удалить")} icon={<Trash2 aria-hidden="true" />} onClick={() => setPendingAction({ action: "delete", document })} />
                </> : <>
                  <ActionIconButton label={t("Открыть")} icon={<Eye aria-hidden="true" />} onClick={() => { setSelected(document); setIsDrawerOpen(true); }} />
                  <ActionIconButton label={t("Отменить проведение")} icon={<Undo2 aria-hidden="true" />} onClick={() => setPendingAction({ action: "unpost", document })} />
                  <ActionIconButton label={t("Перепровести")} icon={<RefreshCcw aria-hidden="true" />} onClick={() => setPendingAction({ action: "repost", document })} />
                </>}
                <ActionIconButton loading={printMutation.isPending && printMutation.variables === document.id} disabled={printMutation.isPending} label={t(printMutation.isPending && printMutation.variables === document.id ? "Формирование…" : "Печать")} icon={<Printer aria-hidden="true" />} onClick={() => printMutation.mutate(document.id)} />
              </div></td>
            </tr>)}
          </tbody></table></div>}
      </div>

      {isDrawerOpen ? <DocumentDrawer document={selected} initialValues={importedValues} products={lookupsQuery.data?.products ?? []} categories={lookupsQuery.data?.categories ?? []} warehouses={lookupsQuery.data?.warehouses ?? []} counterparties={lookupsQuery.data?.counterparties ?? []} documents={documentsQuery.data ?? []} isSaving={saveMutation.isPending} onClose={() => { setIsDrawerOpen(false); setSelected(null); setImportedValues(null); }} onSave={(values) => saveMutation.mutateAsync({ values, document: selected }).then(() => undefined)} onCreateProduct={(payload) => createProductMutation.mutateAsync(payload) as Promise<ProductDto>} /> : null}
      {isPurchaseImportOpen ? <PurchaseListImportDialog
        products={lookupsQuery.data?.products ?? []}
        categories={lookupsQuery.data?.categories ?? []}
        isSaving={createProductMutation.isPending || aliasMutation.isPending}
        onCancel={() => setIsPurchaseImportOpen(false)}
        onCreateProduct={(payload) => createProductMutation.mutateAsync(payload) as Promise<ProductDto>}
        onSaveAliases={(productId, aliases) => aliasMutation.mutateAsync({ productId, aliases })}
        onApply={(rows, products) => {
          queryClient.setQueryData<Awaited<ReturnType<typeof getDocumentLookups>>>(["document-lookups"], (current) => current ? { ...current, products } : current);
          setImportedValues(createImportedPurchase(rows, products, documentsQuery.data ?? []));
          setSelected(null);
          setIsPurchaseImportOpen(false);
          setIsDrawerOpen(true);
        }}
      /> : null}
      {pendingAction ? (
        <div className="dialog-backdrop">
          <div className="confirm-dialog confirm-dialog--document" role="dialog" aria-modal="true" aria-labelledby="lifecycle-title">
            <div className="confirm-dialog__body">
              <h2 id="lifecycle-title">{lifecycleLabels[pendingAction.action].title}</h2>
              <p>{t("Операция изменит документ {number} и связанные движения учёта.", { number: pendingAction.document.number })}</p>
            {["post", "repost"].includes(pendingAction.action) ? (
              <div className="movement-preview" aria-label={t("Предварительный просмотр движений")}>
                {(() => {
                  const movements = getDocumentMovementPreview(
                    pendingAction.document,
                    lookupsQuery.data?.products ?? [],
                    lookupsQuery.data?.warehouses ?? []
                  );
                  return (
                    <>
                      <div className="movement-preview__header">
                        <strong>{t("Будут созданы складские движения")}</strong>
                        <span>{movements.length}</span>
                      </div>
                      <div className="movement-preview__list">
                        {movements.map((movement) => (
                          <div className="movement-preview__row" key={movement.key}>
                            <span className={movement.direction === "IN" ? "movement-preview__direction movement-preview__direction--in" : "movement-preview__direction movement-preview__direction--out"}>
                              {t(movement.direction === "IN" ? "Приход" : "Расход")}
                            </span>
                            <span className="movement-preview__entity">{movement.productLabel}</span>
                            <span className="movement-preview__entity">{movement.warehouseLabel}</span>
                            <strong>{movement.quantity}</strong>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : null}
            {lifecycleMutation.isError ? <div className="form-alert form-alert--detailed" role="alert"><strong>{t("Не удалось выполнить операцию")}</strong><span>{formatApiError(lifecycleMutation.error, { products: lookupsQuery.data?.products, warehouses: lookupsQuery.data?.warehouses })}</span></div> : null}
            </div>
            <div className="confirm-dialog__actions"><button className="button button--secondary" onClick={() => setPendingAction(null)}>{t("Отмена")}</button><button className={pendingAction.action === "delete" ? "button button--danger" : "button button--primary"} disabled={lifecycleMutation.isPending} onClick={() => lifecycleMutation.mutate(pendingAction)}>{lifecycleMutation.isPending ? t("Выполнение…") : lifecycleLabels[pendingAction.action].action}</button></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
