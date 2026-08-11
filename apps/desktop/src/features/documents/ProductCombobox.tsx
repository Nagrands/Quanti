import type { ProductDto } from "@quanti/shared";
import { Check, ChevronDown, Pencil, Search } from "lucide-react";
import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";

import { useI18n } from "../../i18n";

interface ProductComboboxProps {
  value: string;
  products: ProductDto[];
  disabled?: boolean;
  onChange: (productId: string) => void;
  onCreate: () => void;
  onEdit: (product: ProductDto) => void;
}

function productLabel(product: ProductDto) {
  return `${product.sku} · ${product.name}`;
}

export function ProductCombobox({
  value,
  products,
  disabled = false,
  onChange,
  onCreate,
  onEdit
}: ProductComboboxProps) {
  const { t } = useI18n();
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const selectedProduct = products.find((product) => product.id === value);
  const [query, setQuery] = useState(() => selectedProduct ? productLabel(selectedProduct) : "");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const filteredProducts = useMemo(() => {
    const normalized = deferredQuery.trim().toLocaleLowerCase();
    if (!normalized || selectedProduct && normalized === productLabel(selectedProduct).toLocaleLowerCase()) {
      return products;
    }

    return products.filter((product) =>
      `${product.sku} ${product.name} ${(product.aliases ?? []).join(" ")} ${product.categoryName ?? ""} ${product.unit} ${(product.units ?? []).map((unit) => unit.name).join(" ")}`
        .toLocaleLowerCase()
        .includes(normalized)
    );
  }, [deferredQuery, products, selectedProduct]);

  useEffect(() => {
    if (selectedProduct) {
      setQuery(productLabel(selectedProduct));
    }
  }, [selectedProduct]);

  function selectProduct(product: ProductDto) {
    onChange(product.id);
    setQuery(productLabel(product));
    setIsOpen(false);
  }

  function open() {
    if (!disabled) {
      setIsOpen(true);
      setActiveIndex(0);
    }
  }

  return (
    <div
      className="product-combobox"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setQuery(selectedProduct ? productLabel(selectedProduct) : query);
        }
      }}
    >
      <Search className="product-combobox__search" aria-hidden="true" />
      <input
        id={inputId}
        role="combobox"
        aria-label={t("Товар")}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-activedescendant={isOpen && filteredProducts[activeIndex]
          ? `${inputId}-option-${filteredProducts[activeIndex].id}`
          : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={t("Найти товар по названию или SKU")}
        value={query}
        onFocus={open}
        onClick={open}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
          setActiveIndex(0);
          if (value) {
            onChange("");
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((current) => Math.min(current + 1, filteredProducts.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter" && isOpen && filteredProducts[activeIndex]) {
            event.preventDefault();
            selectProduct(filteredProducts[activeIndex]);
          } else if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
      />
      <ChevronDown className="product-combobox__chevron" aria-hidden="true" />
      {selectedProduct && !disabled ? (
        <button
          type="button"
          className="product-combobox__edit-selected"
          aria-label={t("Изменить товар {name}", { name: selectedProduct.name })}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onEdit(selectedProduct)}
        >
          <Pencil aria-hidden="true" />
        </button>
      ) : null}

      {isOpen ? (
        <div className="product-combobox__menu">
          <div id={listboxId} role="listbox" aria-label={t("Результаты поиска товаров")}>
            {filteredProducts.length > 0 ? filteredProducts.map((product, index) => (
              <div className="product-combobox__entry" role="presentation" key={product.id}>
                <button
                  id={`${inputId}-option-${product.id}`}
                  type="button"
                  role="option"
                  aria-label={productLabel(product)}
                  aria-selected={product.id === value}
                  className={index === activeIndex ? "product-combobox__option product-combobox__option--active" : "product-combobox__option"}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectProduct(product)}
                >
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.sku}{product.categoryName ? ` · ${product.categoryName}` : ""}</small>
                  </span>
                  {product.id === value ? <Check aria-hidden="true" /> : null}
                </button>
                <button
                  type="button"
                  className="product-combobox__edit-option"
                  aria-label={t("Изменить товар {name}", { name: product.name })}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onEdit(product)}
                >
                  <Pencil aria-hidden="true" />
                </button>
              </div>
            )) : (
              <div className="product-combobox__empty" role="status">{t("Товары не найдены")}</div>
            )}
          </div>
          <button
            type="button"
            className="product-combobox__create"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setIsOpen(false);
              onCreate();
            }}
          >
            {t("Создать новый товар")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
