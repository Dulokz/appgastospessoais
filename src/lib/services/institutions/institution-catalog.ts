export interface CatalogInstitutionItem {
  id: string;
  name: string;
  category: 'TRADITIONAL_BANK' | 'COOPERATIVE' | 'DIGITAL_BANK' | 'BROKERAGE' | 'CASH';
  color: string;
  badge: string;
}

export const BRAZILIAN_INSTITUTIONS_CATALOG: CatalogInstitutionItem[] = [
  // Bancos Tradicionais
  { id: 'bb', name: 'Banco do Brasil', category: 'TRADITIONAL_BANK', color: 'from-amber-500 to-yellow-400', badge: 'BB' },
  { id: 'caixa', name: 'Caixa Econômica Federal', category: 'TRADITIONAL_BANK', color: 'from-blue-600 to-cyan-500', badge: 'CEF' },
  { id: 'itau', name: 'Itaú Unibanco', category: 'TRADITIONAL_BANK', color: 'from-orange-600 to-amber-500', badge: 'ITAÚ' },
  { id: 'bradesco', name: 'Bradesco', category: 'TRADITIONAL_BANK', color: 'from-red-600 to-rose-500', badge: 'B' },
  { id: 'santander', name: 'Santander', category: 'TRADITIONAL_BANK', color: 'from-red-700 to-red-500', badge: 'SAN' },
  { id: 'banrisul', name: 'Banrisul', category: 'TRADITIONAL_BANK', color: 'from-blue-700 to-blue-500', badge: 'BAN' },
  { id: 'brb', name: 'BRB (Banco de Brasília)', category: 'TRADITIONAL_BANK', color: 'from-blue-600 to-teal-500', badge: 'BRB' },
  { id: 'bnb', name: 'Banco do Nordeste', category: 'TRADITIONAL_BANK', color: 'from-amber-600 to-yellow-500', badge: 'BNB' },

  // Cooperativas de Crédito
  { id: 'sicoob', name: 'Sicoob', category: 'COOPERATIVE', color: 'from-teal-600 to-emerald-500', badge: 'SICOOB' },
  { id: 'sicredi', name: 'Sicredi', category: 'COOPERATIVE', color: 'from-emerald-700 to-green-500', badge: 'SICREDI' },
  { id: 'cresol', name: 'Cresol', category: 'COOPERATIVE', color: 'from-orange-600 to-amber-500', badge: 'CRESOL' },
  { id: 'unicred', name: 'Unicred', category: 'COOPERATIVE', color: 'from-slate-700 to-emerald-600', badge: 'UNI' },
  { id: 'ailos', name: 'Ailos', category: 'COOPERATIVE', color: 'from-cyan-700 to-teal-500', badge: 'AILOS' },

  // Bancos Digitais & Fintechs
  { id: 'nubank', name: 'Nubank', category: 'DIGITAL_BANK', color: 'from-purple-600 to-violet-500', badge: 'NU' },
  { id: 'inter', name: 'Banco Inter', category: 'DIGITAL_BANK', color: 'from-orange-500 to-amber-400', badge: 'INTER' },
  { id: 'c6', name: 'C6 Bank', category: 'DIGITAL_BANK', color: 'from-slate-800 to-slate-600', badge: 'C6' },
  { id: 'neon', name: 'Neon', category: 'DIGITAL_BANK', color: 'from-cyan-500 to-blue-400', badge: 'NEON' },
  { id: 'pagbank', name: 'PagBank', category: 'DIGITAL_BANK', color: 'from-amber-500 to-lime-400', badge: 'PAG' },
  { id: 'mercadopago', name: 'Mercado Pago', category: 'DIGITAL_BANK', color: 'from-sky-500 to-blue-400', badge: 'MP' },
  { id: 'picpay', name: 'PicPay', category: 'DIGITAL_BANK', color: 'from-emerald-600 to-teal-400', badge: 'PIC' },
  { id: 'iti', name: 'iti', category: 'DIGITAL_BANK', color: 'from-orange-600 to-pink-500', badge: 'ITI' },
  { id: 'will', name: 'Will Bank', category: 'DIGITAL_BANK', color: 'from-yellow-400 to-amber-500', badge: 'WILL' },
  { id: 'next', name: 'Next', category: 'DIGITAL_BANK', color: 'from-emerald-500 to-green-400', badge: 'NEXT' },

  // Corretoras & Investimentos
  { id: 'xp', name: 'XP Investimentos', category: 'BROKERAGE', color: 'from-slate-900 to-amber-500', badge: 'XP' },
  { id: 'btg', name: 'BTG Pactual', category: 'BROKERAGE', color: 'from-blue-900 to-slate-700', badge: 'BTG' },
  { id: 'rico', name: 'Rico Investimentos', category: 'BROKERAGE', color: 'from-orange-500 to-red-500', badge: 'RICO' },
  { id: 'clear', name: 'Clear Corretora', category: 'BROKERAGE', color: 'from-cyan-600 to-blue-600', badge: 'CLEAR' },
  { id: 'genial', name: 'Genial Investimentos', category: 'BROKERAGE', color: 'from-blue-600 to-cyan-400', badge: 'GEN' },
  { id: 'agora', name: 'Ágora Investimentos', category: 'BROKERAGE', color: 'from-emerald-700 to-teal-500', badge: 'ÁGORA' },
  { id: 'nuinvest', name: 'NuInvest', category: 'BROKERAGE', color: 'from-purple-700 to-pink-600', badge: 'NUINV' },

  // Espécie e Outros
  { id: 'cash', name: 'Dinheiro em espécie', category: 'CASH', color: 'from-emerald-600 to-teal-500', badge: 'R$' },
  { id: 'digital_wallet', name: 'Carteira digital', category: 'CASH', color: 'from-slate-700 to-slate-500', badge: 'WALLET' },
  { id: 'other', name: 'Outro (Personalizado)', category: 'CASH', color: 'from-slate-800 to-slate-600', badge: 'OUTRO' },
];
