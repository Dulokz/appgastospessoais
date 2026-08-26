"use client";

import React, { useEffect, useRef, useState } from "react";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number | string;
  onChangeValue: (value: number, rawString: string) => void;
  prefix?: string;
}

export function formatAccountingBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value).replace(/[^\d,.-]/g, "");
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const number = Number(normalized);
  if (!Number.isFinite(number) || number === 0) return "";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
}

function parseAccountingBRL(value: string): number {
  const text = value.replace(/[^\d,.-]/g, "");
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

/**
 * Máscara brasileira: digitar 10000 transforma progressivamente em 10.000,00.
 * Os dígitos continuam antes da vírgula; os centavos podem ser ajustados depois.
 */
export function CurrencyInput({
  value,
  onChangeValue,
  prefix = "R$",
  className = "",
  placeholder = "0,00",
  ...props
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    setDisplayValue(formatAccountingBRL(value));
  }, [value]);

  function moveCaretToIntegerEnd() {
    requestAnimationFrame(() => {
      const input = inputRef.current;
      const commaPosition = input?.value.indexOf(",") ?? -1;
      if (input && commaPosition >= 0) input.setSelectionRange(commaPosition, commaPosition);
    });
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = parseAccountingBRL(event.target.value);
    const formatted = formatAccountingBRL(numericValue);
    setDisplayValue(formatted);
    onChangeValue(numericValue, event.target.value);
    moveCaretToIntegerEnd();
  };

  const handleFocus = () => {
    if (displayValue) moveCaretToIntegerEnd();
  };

  return (
    <div className="relative flex items-center w-full">
      {prefix && <span className="absolute left-3 text-xs font-semibold text-muted-foreground pointer-events-none select-none">{prefix}</span>}
      <input
        {...props}
        ref={inputRef}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        className={"w-full px-3 py-2 " + (prefix ? "pl-9 " : "") + "rounded-xl bg-slate-800 border border-white/10 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors " + className}
      />
    </div>
  );
}
