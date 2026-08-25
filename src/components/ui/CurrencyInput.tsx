"use client";

import React, { useEffect, useState } from "react";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number | string;
  onChangeValue: (value: number, rawString: string) => void;
  prefix?: string;
}

export function formatAccountingBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0,00";
  const text = String(value).replace(/[^\d,.-]/g, "");
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const number = Number(normalized);
  if (!Number.isFinite(number)) return "0,00";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
}

function parseAccountingBRL(value: string): number {
  const text = value.replace(/[^\d,.-]/g, "");
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

/**
 * Campo monetário BR: 10000 é entendido como R$ 10.000,00.
 * Pontos separam milhares e vírgula separa centavos.
 */
export function CurrencyInput({
  value,
  onChangeValue,
  prefix = "R$",
  className = "",
  placeholder = "0,00",
  ...props
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDisplayValue(value === "" || value === null || value === undefined ? "" : formatAccountingBRL(value));
  }, [value, editing]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setDisplayValue(raw);
    onChangeValue(parseAccountingBRL(raw), raw);
  };

  const handleFocus = () => {
    setEditing(true);
    if (value !== "" && value !== null && value !== undefined) setDisplayValue(String(value).replace(".", ","));
  };

  const handleBlur = () => {
    setEditing(false);
    setDisplayValue(formatAccountingBRL(value));
  };

  return (
    <div className="relative flex items-center w-full">
      {prefix && <span className="absolute left-3 text-xs font-semibold text-muted-foreground pointer-events-none select-none">{prefix}</span>}
      <input
        {...props}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={"w-full px-3 py-2 " + (prefix ? "pl-9 " : "") + "rounded-xl bg-slate-800 border border-white/10 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors " + className}
      />
    </div>
  );
}
