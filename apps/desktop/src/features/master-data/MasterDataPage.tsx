import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Ban, Pencil, Plus, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { useI18n } from "../../i18n";
import {
  createMasterData,
  deactivateMasterData,
  getMasterData,
  restoreMasterData,
  updateMasterData
} from "./master-data-api";
import { MasterDataFormDrawer } from "./MasterDataFormDrawer";
import {
  type FormValues,
  createMasterDataDefaults,
  getLocalizedMasterDataDefinitions,
  type MasterDataEntity,
  type MasterDataResource
} from "./master-data";

type StatusFilter = "active" | "archived" | "all";
type SortDirection = "ascending" | "descending";
interface SortState {
  columnKey: string;
  direction: SortDirection;
}

export function MasterDataPage() {
  const { formatApiError, locale, t } = useI18n();
  const queryClient = useQueryClient();
  const [resource, setResource] = useState<MasterDataResource>("products");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [sortByResource, setSortByResource] = useState<Partial<Record<MasterDataResource, SortState>>>({});
  const [editingEntity, setEditingEntity] = useState<MasterDataEntity | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<FormValues>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deactivatingEntity, setDeactivatingEntity] = useState<MasterDataEntity | null>(null);
  const [restoringEntity, setRestoringEntity] = useState<MasterDataEntity | null>(null);
  const queryKey = ["master-data", resource] as const;

  const entitiesQuery = useQuery({
    queryKey,
    queryFn: () => getMasterData(resource, true)
  });
  const categoriesQuery = useQuery({
    queryKey: ["master-data", "product-categories", "active"],
    queryFn: () => getMasterData("product-categories")
  });
  const definitions = useMemo(() => getLocalizedMasterDataDefinitions(t, locale, {
    "product-categories": (categoriesQuery.data ?? [])
      .filter((entity) => entity.isActive)
      .map((entity) => ({ label: entity.name, value: entity.id }))
  }), [categoriesQuery.data, locale, t]);
  const definition = definitions.find((item) => item.resource === resource) ?? definitions[0];

  const saveMutation = useMutation({
    mutationFn: ({ values, entity }: { values: FormValues; entity: MasterDataEntity | null }) => {
      const payload = definition.toPayload(values);
      return entity
        ? updateMasterData(resource, entity.id, payload)
        : createMasterData(resource, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      if (resource === "product-categories") {
        await queryClient.invalidateQueries({ queryKey: ["master-data", "product-categories", "active"] });
      }
      setIsFormOpen(false);
      setEditingEntity(null);
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: (entity: MasterDataEntity) => deactivateMasterData(resource, entity.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      if (resource === "product-categories") {
        await queryClient.invalidateQueries({ queryKey: ["master-data", "product-categories", "active"] });
      }
      setDeactivatingEntity(null);
    }
  });

  const restoreMutation = useMutation({
    mutationFn: (entity: MasterDataEntity) => restoreMasterData(resource, entity.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      if (resource === "product-categories") {
        await queryClient.invalidateQueries({ queryKey: ["master-data", "product-categories", "active"] });
      }
      setRestoringEntity(null);
    }
  });

  const entities = entitiesQuery.data ?? [];
  const activeCount = entities.filter((entity) => entity.isActive).length;
  const archivedCount = entities.length - activeCount;

  const visibleEntities = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const filtered = entities.filter((entity) => {
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "active" ? entity.isActive : !entity.isActive);
      const matchesSearch = !normalizedSearch || definition.columns.some((column) =>
        column.render(entity).toLocaleLowerCase().includes(normalizedSearch)
      );

      return matchesStatus && matchesSearch;
    });

    const sort = sortByResource[resource];
    const sortColumn = definition.columns.find((column) => column.key === sort?.columnKey);
    if (!sort || !sortColumn?.sortValue) {
      return filtered;
    }

    const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
    return filtered
      .map((entity, index) => ({ entity, index }))
      .sort((left, right) => {
        const leftValue = sortColumn.sortValue!(left.entity);
        const rightValue = sortColumn.sortValue!(right.entity);
        const comparison = typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : collator.compare(String(leftValue), String(rightValue));
        return (sort.direction === "ascending" ? comparison : -comparison) || left.index - right.index;
      })
      .map(({ entity }) => entity);
  }, [definition, entities, locale, resource, search, sortByResource, statusFilter]);

  function toggleSort(columnKey: string) {
    setSortByResource((current) => {
      const currentSort = current[resource];
      return {
        ...current,
        [resource]: {
          columnKey,
          direction: currentSort?.columnKey === columnKey && currentSort.direction === "ascending"
            ? "descending"
            : "ascending"
        }
      };
    });
  }

  function selectResource(nextResource: MasterDataResource) {
    setResource(nextResource);
    setSearch("");
    setStatusFilter("active");
    setEditingEntity(null);
    setIsFormOpen(false);
    setDeactivatingEntity(null);
    setRestoringEntity(null);
  }

  const emptyTitle = search
    ? "Совпадений не найдено"
    : statusFilter === "archived"
      ? "Архивных записей нет"
      : statusFilter === "active" && entities.length > 0
        ? "Активных записей нет"
        : "Записей пока нет";
  const emptyDescription = search
    ? "Измените поисковый запрос или фильтр активности."
    : statusFilter === "archived"
      ? "Деактивированные записи появятся здесь."
      : statusFilter === "active" && entities.length > 0
        ? "Переключите фильтр на все записи или создайте новую активную запись."
        : "Создайте первую запись, чтобы начать работу.";

  return (
    <section className="page master-data-page" aria-labelledby="master-data-title">
      <header className="page__header">
        <p className="page__eyebrow">{t("Справочники")}</p>
        <h1 id="master-data-title">{definition.label}</h1>
      </header>

      <nav className="section-tabs" aria-label={t("Разделы справочников")}>
        {definitions.map((item) => (
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

      <div className="master-data-summary" aria-label={t("Сводка справочника")}>
        <div className="summary-card">
          <span>{t("Всего")}</span>
          <strong>{entities.length}</strong>
        </div>
        <div className="summary-card summary-card--active">
          <span>{t("Активные")}</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="summary-card summary-card--archived">
          <span>{t("Архивные")}</span>
          <strong>{archivedCount}</strong>
        </div>
        <div className="summary-card">
          <span>{t("Показано")}</span>
          <strong>{visibleEntities.length}</strong>
        </div>
      </div>

      <div className="data-toolbar">
        <div className="data-toolbar__filters">
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
          <label className="filter-field">
            <span>{t("Статус")}</span>
            <select
              value={statusFilter}
              aria-label={t("Фильтр активности")}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="active">{t("Только активные")}</option>
              <option value="archived">{t("Только архивные")}</option>
              <option value="all">{t("Все записи")}</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          className="button button--primary"
          onClick={() => {
            setEditingEntity(null);
            setFormInitialValues(createMasterDataDefaults(definition, entities));
            setIsFormOpen(true);
          }}
        >
          <Plus aria-hidden="true" />
          {t("Создать")}
        </button>
      </div>

      <div className="data-table-frame">
        {entitiesQuery.isPending ? (
          <div className="table-state" role="status">{t("Загрузка…")}</div>
        ) : entitiesQuery.isError ? (
          <div className="table-state table-state--error" role="alert">
            <strong>{t("Не удалось загрузить данные.")}</strong>
            <span>{formatApiError(entitiesQuery.error)}</span>
            <button type="button" className="button button--secondary" onClick={() => void entitiesQuery.refetch()}>
              {t("Повторить")}
            </button>
          </div>
        ) : visibleEntities.length === 0 ? (
          <div className="table-state">
            <strong>{t(emptyTitle)}</strong>
            <span>{t(emptyDescription)}</span>
          </div>
        ) : (
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {definition.columns.map((column) => {
                    const sort = sortByResource[resource];
                    const isActive = sort?.columnKey === column.key;
                    const nextDirection = isActive && sort.direction === "ascending" ? "descending" : "ascending";
                    return (
                      <th
                        aria-sort={column.sortValue && isActive ? sort.direction : undefined}
                        key={column.key}
                      >
                        {column.sortValue ? (
                          <button
                            type="button"
                            className="data-table__sort-button"
                            aria-label={t(
                              nextDirection === "ascending"
                                ? "Сортировать {column} по возрастанию"
                                : "Сортировать {column} по убыванию",
                              { column: column.label }
                            )}
                            onClick={() => toggleSort(column.key)}
                          >
                            <span>{column.label}</span>
                            {isActive ? (
                              sort.direction === "ascending"
                                ? <ArrowUp aria-hidden="true" />
                                : <ArrowDown aria-hidden="true" />
                            ) : null}
                          </button>
                        ) : column.label}
                      </th>
                    );
                  })}
                  <th>{t("Статус")}</th>
                  <th className="data-table__actions-heading">{t("Действия")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleEntities.map((entity) => (
                  <tr key={entity.id} className={entity.isActive ? undefined : "data-table__row--archived"}>
                    {definition.columns.map((column) => (
                      <td
                        className={`data-table__cell data-table__cell--${column.key}`}
                        key={column.key}
                      >
                        {column.render(entity).split("\n").map((line, index) => (
                          <span
                            className={index === 0
                              ? "data-table__cell-line data-table__cell-line--primary"
                              : "data-table__cell-line data-table__cell-line--secondary"}
                            key={`${column.key}-${index}`}
                          >
                            {line}
                          </span>
                        ))}
                      </td>
                    ))}
                    <td>
                      <span className={entity.isActive ? "status-badge status-badge--active" : "status-badge status-badge--archived"}>
                        {t(entity.isActive ? "Активна" : "Архив")}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={t("Изменить {name}", { name: entity.name })}
                          disabled={!entity.isActive}
                          onClick={() => {
                            setEditingEntity(entity);
                            setFormInitialValues(definition.toFormValues(entity));
                            setIsFormOpen(true);
                          }}
                        >
                          <Pencil aria-hidden="true" />
                        </button>
                        {entity.isActive ? (
                          <button
                            type="button"
                            className="icon-button icon-button--danger"
                            aria-label={t("Деактивировать {name}", { name: entity.name })}
                            onClick={() => setDeactivatingEntity(entity)}
                          >
                            <Ban aria-hidden="true" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="icon-button icon-button--success"
                            aria-label={t("Восстановить {name}", { name: entity.name })}
                            onClick={() => setRestoringEntity(entity)}
                          >
                            <RotateCcw aria-hidden="true" />
                          </button>
                        )}
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
          initialValues={formInitialValues}
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
            <h2 id="deactivate-title">{t("Деактивировать запись?")}</h2>
            <p>
              {t("{name} исчезнет из активных списков. Запись можно будет восстановить из архива.", { name: deactivatingEntity.name })}
            </p>
            {deactivateMutation.isError ? (
              <div className="form-alert" role="alert">
                {formatApiError(deactivateMutation.error)}
              </div>
            ) : null}
            <div className="confirm-dialog__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setDeactivatingEntity(null)}
              >
                {t("Отмена")}
              </button>
              <button
                type="button"
                className="button button--danger"
                disabled={deactivateMutation.isPending}
                onClick={() => deactivateMutation.mutate(deactivatingEntity)}
              >
                {t(deactivateMutation.isPending ? "Деактивация…" : "Деактивировать")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {restoringEntity ? (
        <div className="dialog-backdrop" role="presentation">
          <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="restore-title">
            <h2 id="restore-title">{t("Восстановить запись?")}</h2>
            <p>
              {t("{name} вернётся в активные списки и снова будет доступен для новых операций.", { name: restoringEntity.name })}
            </p>
            {restoreMutation.isError ? (
              <div className="form-alert" role="alert">
                {formatApiError(restoreMutation.error)}
              </div>
            ) : null}
            <div className="confirm-dialog__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setRestoringEntity(null)}
              >
                {t("Отмена")}
              </button>
              <button
                type="button"
                className="button button--primary"
                disabled={restoreMutation.isPending}
                onClick={() => restoreMutation.mutate(restoringEntity)}
              >
                {t(restoreMutation.isPending ? "Восстановление…" : "Восстановить")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
