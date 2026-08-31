'use client';

import React from 'react';

export interface BankLogoProps {
  bankId?: string;
  bankName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BankLogo({ bankId, bankName, size = 'md', className = '' }: BankLogoProps) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
  }[size];

  const normId = (bankId || bankName || '').toLowerCase();

  // BANCO DO BRASIL
  if (normId === 'bb' || normId.includes('brasil')) {
    return (
      <div className={`${sizeClasses} rounded-xl bg-yellow-400 text-blue-900 font-extrabold flex items-center justify-center shadow-lg border border-yellow-300 ${className}`}>
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4 fill-current">
          <path d="M20 20 h60 v60 h-60 z M35 35 v30 h30 v-30 z" opacity="0.3" />
          <text x="50" y="65" textAnchor="middle" fontSize="42" fontWeight="900" fontFamily="sans-serif">BB</text>
        </svg>
      </div>
    );
  }

  // ITAÚ
  if (normId === 'itau' || normId.includes('itaú')) {
    return (
      <div className={`${sizeClasses} rounded-xl bg-orange-600 text-white font-extrabold flex items-center justify-center shadow-lg border border-orange-500 ${className}`}>
        <span className="font-serif italic font-extrabold text-white tracking-tighter drop-shadow">itaú</span>
      </div>
    );
  }

  // NUBANK
  if (normId === 'nubank' || normId.includes('nu')) {
    return (
      <div className={`${sizeClasses} rounded-xl bg-purple-700 text-white font-extrabold flex items-center justify-center shadow-lg border border-purple-600 ${className}`}>
        <span className="font-sans font-black text-white tracking-tighter text-sm">nu</span>
      </div>
    );
  }

  // BRADESCO
  if (normId === 'bradesco') {
    return (
      <div className={`${sizeClasses} rounded-xl bg-red-600 text-white font-extrabold flex items-center justify-center shadow-lg border border-red-500 ${className}`}>
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4 fill-white">
          <path d="M50 15 L85 80 L65 80 L50 45 L35 80 L15 80 Z" />
          <circle cx="50" cy="30" r="10" />
        </svg>
      </div>
    );
  }

  // SANTANDER
  if (normId === 'santander' || normId === 'san') {
    return (
      <div className={`${sizeClasses} rounded-xl bg-red-700 text-white font-extrabold flex items-center justify-center shadow-lg border border-red-600 ${className}`}>
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4 fill-white">
          <path d="M50 10 Q70 40 50 65 Q30 40 50 10 Z M35 60 Q50 90 65 60 Z" />
        </svg>
      </div>
    );
  }

  // CAIXA
  if (normId === 'caixa' || normId === 'cef') {
    return (
      <div className={`${sizeClasses} rounded-xl bg-blue-700 text-amber-400 font-extrabold flex items-center justify-center shadow-lg border border-blue-600 ${className}`}>
        <span className="font-sans font-black text-white text-xs tracking-tight">CAIXA</span>
      </div>
    );
  }

  // BANCO INTER
  if (normId === 'inter') {
    return (
      <div className={`${sizeClasses} rounded-xl bg-orange-500 text-white font-extrabold flex items-center justify-center shadow-lg border border-orange-400 ${className}`}>
        <span className="font-sans font-black text-white text-xs lowercase">inter</span>
      </div>
    );
  }

  // C6 BANK
  if (normId === 'c6') {
    return (
      <div className={`${sizeClasses} rounded-xl bg-slate-900 text-yellow-400 font-extrabold flex items-center justify-center shadow-lg border border-slate-700 ${className}`}>
        <span className="font-sans font-black text-yellow-400 text-sm">C6</span>
      </div>
    );
  }

  // SICOOB
  if (normId === 'sicoob') {
    return (
      <div className={`${sizeClasses} rounded-xl bg-teal-700 text-emerald-300 font-extrabold flex items-center justify-center shadow-lg border border-teal-600 ${className}`}>
        <span className="font-sans font-black text-emerald-300 text-[10px] tracking-tight">SICOOB</span>
      </div>
    );
  }

  // XP INVESTIMENTOS
  if (normId === 'xp') {
    return (
      <div className={`${sizeClasses} rounded-xl bg-slate-950 text-amber-400 font-extrabold flex items-center justify-center shadow-lg border border-amber-500/40 ${className}`}>
        <span className="font-sans font-black text-amber-400 text-sm tracking-wider">XP</span>
      </div>
    );
  }

  // BTG PACTUAL
  if (normId === 'btg') {
    return (
      <div className={`${sizeClasses} rounded-xl bg-blue-950 text-sky-400 font-extrabold flex items-center justify-center shadow-lg border border-blue-800 ${className}`}>
        <span className="font-sans font-black text-sky-300 text-xs">BTG</span>
      </div>
    );
  }

  // SICREDI
  if (normId === 'sicredi') {
    return (
      <div className={`${sizeClasses} rounded-xl bg-emerald-700 text-white font-extrabold flex items-center justify-center shadow-lg border border-emerald-600 ${className}`}>
        <span className="font-sans font-black text-white text-[10px]">SICREDI</span>
      </div>
    );
  }

  // MERCADO PAGO
  if (normId === 'mercadopago' || normId === 'mp') {
    return (
      <div className={`${sizeClasses} rounded-xl bg-sky-500 text-white font-extrabold flex items-center justify-center shadow-lg border border-sky-400 ${className}`}>
        <span className="font-sans font-black text-white text-[10px]">MP</span>
      </div>
    );
  }

  // PICPAY
  if (normId === 'picpay' || normId === 'pic') {
    return (
      <div className={`${sizeClasses} rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center shadow-lg border border-emerald-500 ${className}`}>
        <span className="font-sans font-black text-white text-xs">PicPay</span>
      </div>
    );
  }

  // DEFAULT / OUTROS
  return (
    <div className={`${sizeClasses} rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-extrabold flex items-center justify-center shadow-lg border border-slate-600 ${className}`}>
      <span className="font-sans font-black text-slate-200 text-xs uppercase">{normId.substring(0, 3) || 'BANK'}</span>
    </div>
  );
}
