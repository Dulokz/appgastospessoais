'use client';

import React, { useState } from 'react';
import { Calendar, Filter, Clock, CalendarRange, ChevronDown } from 'lucide-react';

export type PeriodType = 'ALL_TIME' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM';

export interface PeriodFilterState {
  periodType: PeriodType;
  startDate?: string;
  endDate?: string;
  selectedMonth?: string; // ex: '2025-01'
}

interface PeriodFilterProps {
  initialState?: PeriodFilterState;
  onPeriodChange: (filter: PeriodFilterState) => void;
  className?: string;
}

export function PeriodFilter({ initialState, onPeriodChange, className = '' }: PeriodFilterProps) {
  const [periodType, setPeriodType] = useState<PeriodType>(initialState?.periodType || 'ALL_TIME');
  const [startDate, setStartDate] = useState<string>(initialState?.startDate || '2025-01-01');
  const [endDate, setEndDate] = useState<string>(initialState?.endDate || new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialState?.selectedMonth || '2025-01');
  const [isCustomOpen, setIsCustomOpen] = useState<boolean>(false);

  const handleSelectType = (type: PeriodType) => {
    setPeriodType(type);
    if (type === 'CUSTOM') {
      setIsCustomOpen(true);
    } else {
      setIsCustomOpen(false);
      onPeriodChange({ periodType: type, startDate, endDate, selectedMonth });
    }
  };

  const handleApplyCustom = () => {
    onPeriodChange({ periodType: 'CUSTOM', startDate, endDate });
    setIsCustomOpen(false);
  };

  const monthOptions = [
    '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
    '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
    '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
    '2026-07', '2026-08',
  ];

  return (
    <div className={`relative flex flex-wrap items-center gap-2 ${className}`}>
      <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
        <button
          type="button"
          onClick={() => handleSelectType('ALL_TIME')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
            periodType === 'ALL_TIME'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Desde o Início</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectType('THIS_MONTH')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
            periodType === 'THIS_MONTH'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Este Mês</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectType('THIS_YEAR')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
            periodType === 'THIS_YEAR'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CalendarRange className="w-3.5 h-3.5" />
          <span>Este Ano</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectType('CUSTOM')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
            periodType === 'CUSTOM'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Personalizado</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Modal / Popover para Data Personalizada */}
      {isCustomOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-3 min-w-[280px]">
          <div className="text-xs font-bold text-slate-300">Selecione o Intervalo de Datas:</div>
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Data Inicial:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Data Final:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCustomOpen(false)}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApplyCustom}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all shadow-md"
            >
              Aplicar Filtro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
