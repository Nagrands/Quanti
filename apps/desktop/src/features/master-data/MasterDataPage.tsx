import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ApiError } from "../../api/errors";
import {
  createMasterData,
  deactivateMasterData,
  getMasterData,
  updateMasterData
} from "./master-data-api";
import { MasterDataFormDrawer } from "./MasterDataFormDrawer";
import {
  type FormValues,
  getMasterDataDefinition,
  masterDataDefinitions,
  type MasterDataEntity,
  type MasterDataResource
} from "./master-data";

export function MasterDataPage() {
  const queryClient = useQueryClient();
  const [resource, setResource] = useState<MasterDataResource>("products");
  const [search, setSearch] = useState("");
  const [editingEntity, setEditingEntity] = useState<MasterDataEntity | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deactivatingEntity, setDeactivatingEntity] = useState<MasterDataEntity | null>(null);
  const definition = getMasterDataDefinition(resource);
  const queryKey = ["master-data", resource] as const;

  const entitiesQuery = useQuery({
    queryKey,
    queryFn: () => getMasterData(resource)
  });

  const saveMutation = useMutation({
    mutationFn: ({ values, entity }: { values: FormValues; entity: MasterDataEntity | null }) => {
      const payload = definition.toPayload(values);
      return entity
        ? updateMasterData(resource, entity.id, payload)
        : createMasterData(resource, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setIsFormOpen(false);
      setEditingEntity(null);
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: (entity: MasterDataEntity) => deactivateMasterData(resource, entity.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setDeactivatingEntity(null);
    }
  });

  const filteredEntities = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!normalizedSearch) {
      return entitiesQuery.data ?? [];
    }

    return (entitiesQuery.data ?? []).filter((entity) =>
      definition.columns.some((column) =>
        column.render(entity).toLocaleLowerCase().includes(normalizedSearch)
      )
    );
  }, [definition, entitiesQuery.data, search]);

  function selectResource(nextResource: MasterDataResource) {
    setResource(nextResource);
    setSearch("");
    setEditingEntity(null);
    setIsFormOpen(false);
    setDeactivatingEntity(null);
  }

  return (
    <section className="page master-data-page" aria-labelledby="products-title">
      <header className="page__header">
        <p className="page__eyebrow">Master data</p>
        <h1 id="products-title">Products</h1>
      </header>

      <nav className="section-tabs" aria-label="Master data sections">
        {masterDataDefinitions.map((item) => (
          <button
            key={item.resource}
            type="button"
            className={item.resource === resource ? "section-tabs__item section-tabs__item--active" : "section-tabs__item"}
            aria-current={item.resource === resource ? "page" : undefined}
            onClick={() => selectResource(item.resource)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="data-toolbar">
        <label className="search-field">
          <Search aria-hidden="true" />
          <span className="visually-hidden">{definition.searchPlaceholder}</span>
          <input
            type="search"
            placeholder={definition.searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="button button--primary"
          onClick={() => {
            setEditingEntity(null);
            setIsFormOpen(true);
          }}
        >
          <Plus aria-hidden="true" />
          New {definition.singularLabel}
        </button>
      </div>

      <div className="data-table-frame">
        {entitiesQuery.isPending ? (
          <div className="table-state" role="status">Loading {definition.label.toLocaleLowerCase()}…</div>
        ) : entitiesQuery.isError ? (
          <div className="table-state table-state--error" role="alert">
            <strong>Unable to load {definition.label.toLocaleLowerCase()}.</strong>
            <span>{entitiesQuery.error instanceof ApiError ? entitiesQuery.error.message : "Check the API connection and try again."}</span>
            <button type="button" className="button button--secondary" onClick={() => void entitiesQuery.refetch()}>
              Retry
            </button>
          </div>
        ) : filteredEntities.length === 0 ? (
          <div className="table-state">
            <strong>{search ? "No matching records" : `No ${definition.label.toLocaleLowerCase()} yet`}</strong>
            <span>{search ? "Try a different search term." : `Create the first ${definition.singularLabel} to get started.`}</span>
          </div>
        ) : (
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {definition.columns.map((column) => <th key={column.key}>{column.label}</th>)}
                  <th className="data-table__actions-heading">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntities.map((entity) => (
                  <tr key={entity.id}>
                    {definition.columns.map((column) => (
                      <td key={column.key}>{column.render(entity)}</td>
                    ))}
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Edit ${entity.name}`}
                          onClick={() => {
                            setEditingEntity(entity);
                            setIsFormOpen(true);
                          }}
                        >
                          <Pencil aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button--danger"
                          aria-label={`Deactivate ${entity.name}`}
                          onClick={() => setDeactivatingEntity(entity)}
                        >
                          <Ban aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen ? (
        <MasterDataFormDrawer
          definition={definition}
          entity={editingEntity}
          isSaving={saveMutation.isPending}
          onClose={() => {
            setIsFormOpen(false);
            setEditingEntity(null);
          }}
          onSave={(values) => saveMutation.mutateAsync({ values, entity: editingEntity }).then(() => undefined)}
        />
      ) : null}

      {deactivatingEntity ? (
        <div className="dialog-backdrop" role="presentation">
          <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="deactivate-title">
            <h2 id="deactivate-title">Deactivate {definition.singularLabel}?</h2>
            <p>
              <strong>{deactivatingEntity.name}</strong> will disappear from active lists and cannot currently be restored.
            </p>
            {deactivateMutation.isError ? (
              <div className="form-alert" role="alert">
                {deactivateMutation.error instanceof ApiError
                  ? deactivateMutation.error.message
                  : "Unable to deactivate this record."}
              </div>
            ) : null}
            <div className="confirm-dialog__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setDeactivatingEntity(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button--danger"
                disabled={deactivateMutation.isPending}
                onClick={() => deactivateMutation.mutate(deactivatingEntity)}
              >
                {deactivateMutation.isPending ? "Deactivating…" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
