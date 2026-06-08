import type { DocumentDto, DocumentStatus, DocumentType } from "@quanti/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ApiError } from "../../api/errors";
import { DocumentDrawer } from "./DocumentDrawer";
import {
  createDocument,
  deleteDocument,
  downloadDocumentPdf,
  getDocumentLookups,
  getDocuments,
  postDocument,
  printDocument,
  repostDocument,
  unpostDocument,
  updateDocument
} from "./documents-api";
import { documentTypeLabels, type DocumentFormValues, toDocumentPayload } from "./document-model";

type LifecycleAction = "post" | "unpost" | "repost" | "delete";

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | DocumentStatus>("");
  const [type, setType] = useState<"" | DocumentType>("");
  const [selected, setSelected] = useState<DocumentDto | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: LifecycleAction; document: DocumentDto } | null>(null);
  const [printError, setPrintError] = useState("");

  const documentsQuery = useQuery({ queryKey: ["documents"], queryFn: getDocuments });
  const lookupsQuery = useQuery({ queryKey: ["document-lookups"], queryFn: getDocumentLookups });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["documents"] });

  const saveMutation = useMutation({
    mutationFn: ({ values, document }: { values: DocumentFormValues; document: DocumentDto | null }) =>
      document ? updateDocument(document.id, toDocumentPayload(values)) : createDocument(toDocumentPayload(values)),
    onSuccess: async () => {
      await refresh();
      setIsDrawerOpen(false);
      setSelected(null);
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
    onSuccess: (result, id) => {
      const document = documentsQuery.data?.find((item) => item.id === id);
      downloadDocumentPdf(result.data, result.fileName || `${document?.number ?? "document"}.pdf`);
      setPrintError("");
    },
    onError: (error) => {
      setPrintError(error instanceof ApiError ? error.message : "Unable to generate PDF.");
    }
  });

  const filtered = useMemo(() => (documentsQuery.data ?? []).filter((document) => {
    const text = search.trim().toLowerCase();
    return (!status || document.status === status)
      && (!type || document.type === type)
      && (!text || `${document.number} ${documentTypeLabels[document.type]}`.toLowerCase().includes(text));
  }), [documentsQuery.data, search, status, type]);

  return (
    <section className="page documents-page" aria-labelledby="documents-title">
      <header className="page__header"><p className="page__eyebrow">Operations</p><h1 id="documents-title">Documents</h1></header>
      <div className="document-toolbar">
        <label className="search-field"><Search /><span className="visually-hidden">Search documents</span><input type="search" placeholder="Search documents" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <select aria-label="Status filter" value={status} onChange={(event) => setStatus(event.target.value as "" | DocumentStatus)}><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="POSTED">Posted</option></select>
        <select aria-label="Type filter" value={type} onChange={(event) => setType(event.target.value as "" | DocumentType)}><option value="">All types</option>{Object.entries(documentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button type="button" className="button button--primary" onClick={() => { setSelected(null); setIsDrawerOpen(true); }}><Plus /> New document</button>
      </div>
      {printError ? <div className="form-alert document-print-alert" role="alert">{printError}</div> : null}

      <div className="data-table-frame">
        {documentsQuery.isPending ? <div className="table-state">Loading documents…</div>
          : documentsQuery.isError ? <div className="table-state table-state--error"><strong>Unable to load documents.</strong><span>{documentsQuery.error instanceof ApiError ? documentsQuery.error.message : "Try again."}</span><button className="button button--secondary" onClick={() => void documentsQuery.refetch()}>Retry</button></div>
          : filtered.length === 0 ? <div className="table-state"><strong>No documents found</strong><span>Create a draft or adjust the filters.</span></div>
          : <div className="data-table-scroll"><table className="data-table documents-table"><thead><tr><th>Number</th><th>Type</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {filtered.map((document) => <tr key={document.id}>
              <td><button className="table-link" onClick={() => { setSelected(document); setIsDrawerOpen(true); }}>{document.number}</button></td>
              <td>{documentTypeLabels[document.type]}</td><td>{new Date(document.documentDate).toLocaleDateString()}</td><td>{document.items.length}</td><td>{document.totalAmount}</td>
              <td><span className={`status-label status-label--${document.status.toLowerCase()}`}>{document.status}</span></td>
              <td><div className="document-actions">
                {document.status === "DRAFT" ? <><button onClick={() => { setSelected(document); setIsDrawerOpen(true); }}>{document.type === "STOCK_ADJUSTMENT" ? "View" : "Edit"}</button>{document.type !== "STOCK_ADJUSTMENT" ? <button onClick={() => setPendingAction({ action: "post", document })}>Post</button> : null}<button onClick={() => setPendingAction({ action: "delete", document })}>Delete</button></>
                  : <><button onClick={() => { setSelected(document); setIsDrawerOpen(true); }}>View</button><button onClick={() => setPendingAction({ action: "unpost", document })}>Unpost</button><button onClick={() => setPendingAction({ action: "repost", document })}>Repost</button></>}
                <button disabled={printMutation.isPending} onClick={() => printMutation.mutate(document.id)}>{printMutation.isPending && printMutation.variables === document.id ? "Printing…" : "Print"}</button>
                <MoreHorizontal aria-hidden="true" />
              </div></td>
            </tr>)}
          </tbody></table></div>}
      </div>

      {isDrawerOpen ? <DocumentDrawer document={selected} products={lookupsQuery.data?.products ?? []} warehouses={lookupsQuery.data?.warehouses ?? []} counterparties={lookupsQuery.data?.counterparties ?? []} isSaving={saveMutation.isPending} onClose={() => { setIsDrawerOpen(false); setSelected(null); }} onSave={(values) => saveMutation.mutateAsync({ values, document: selected }).then(() => undefined)} /> : null}
      {pendingAction ? <div className="dialog-backdrop"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="lifecycle-title"><h2 id="lifecycle-title">{pendingAction.action[0].toUpperCase() + pendingAction.action.slice(1)} document?</h2><p>This operation will update document <strong>{pendingAction.document.number}</strong> and its ledger effect.</p>{lifecycleMutation.isError ? <div className="form-alert">{lifecycleMutation.error instanceof ApiError ? lifecycleMutation.error.message : "Operation failed."}</div> : null}<div className="confirm-dialog__actions"><button className="button button--secondary" onClick={() => setPendingAction(null)}>Cancel</button><button className={pendingAction.action === "delete" ? "button button--danger" : "button button--primary"} disabled={lifecycleMutation.isPending} onClick={() => lifecycleMutation.mutate(pendingAction)}>Confirm</button></div></div></div> : null}
    </section>
  );
}
