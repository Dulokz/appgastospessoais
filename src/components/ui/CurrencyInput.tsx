"use client";

import React, { useState, useEffect } from "react";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number | string;
  onChangeValue: (value: number, rawString: string) => void;
  prefix?: string;
}

/**
 * Formata um valor numérico ou string em formato contábil BR (ex: 10.000,00)
 */
export function formatAccountingBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0,00";

  let num: number;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.,-]/g, "");
    if (cleaned.includes(",")) {
      num = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
    } else {
      num = parseFloat(cleaned);
    }
  } else {
    num = value;
  }

  if (isNaN(num)) return "0,00";

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Converte digitação em centavos no formato contábil "10.000,00"
 */
function rawDigitsToFormatted(digits: string): { formatted: string; numValue: number } {
  const onlyNums = digits.replace(/\D/g, "");
  if (!onlyNums) return { formatted: "0,00", numValue: 0 };

  const numValue = parseInt(onlyNums, 10) / 100;
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);

  return { formatted, numValue };
}

export function CurrencyInput({
  value,
  onChangeValue,
  prefix = "R$",
  className = "",
  placeholder = "0,00",
  ...props
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState<string>("");

  useEffect(() => {
    if (value === "" || value === null || value === undefined) {
      setDisplayValue("");
      return;
    }
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num) || num === 0) {
      setDisplayValue("");
    } else {
      setDisplayValue(formatAccountingBRL(num));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === "") {
      setDisplayValue("");
      onChangeValue(0, "0");
      return;
    }
    const { formatted, numValue } = rawDigitsToFormatted(inputValue);
    setDisplayValue(formatted);
    onChangeValue(numValue, numValue.toString());
  };

  return (
    <div className="relative flex items-center w-full">
      {prefix && (
        <span className="absolute left-3 text-xs font-semibold text-muted-foreground pointer-events-none select-none">
          {prefix}
        </span>
      )}
      <input
        {...props}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        className={`w-full px-3 py-2 ${prefix ? "pl-9" : ""} rounded-xl bg-slate-800 border border-white/10 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors ${className}`}
      />
    </div>
  );
}
