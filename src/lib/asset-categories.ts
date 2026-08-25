export type AssetCategoryOption = {
  value: string;
  label: string;
  group: string;
  examples?: string;
};

export const ASSET_CATEGORY_OPTIONS: AssetCategoryOption[] = [
  // Imóveis
  { value: "REAL_ESTATE_RESIDENTIAL", label: "Imóvel residencial", group: "Imóveis", examples: "Casa, apartamento, kitnet" },
  { value: "REAL_ESTATE_COMMERCIAL", label: "Imóvel comercial", group: "Imóveis", examples: "Sala, loja, galpão" },
  { value: "REAL_ESTATE_LAND", label: "Terreno / lote", group: "Imóveis" },
  { value: "REAL_ESTATE_RURAL", label: "Imóvel rural", group: "Imóveis", examples: "Sítio, chácara, fazenda" },
  { value: "REAL_ESTATE_OTHER", label: "Outro imóvel", group: "Imóveis", examples: "Garagem, box, fração imobiliária" },

  // Veículos e mobilidade
  { value: "VEHICLE_CAR", label: "Carro", group: "Veículos e mobilidade" },
  { value: "VEHICLE_MOTORCYCLE", label: "Moto", group: "Veículos e mobilidade" },
  { value: "VEHICLE_UTILITY", label: "Utilitário / van / Kombi", group: "Veículos e mobilidade" },
  { value: "VEHICLE_TRUCK", label: "Caminhão / veículo pesado", group: "Veículos e mobilidade" },
  { value: "VEHICLE_WATERCRAFT", label: "Embarcação", group: "Veículos e mobilidade" },
  { value: "VEHICLE_AIRCRAFT", label: "Aeronave", group: "Veículos e mobilidade" },
  { value: "PERSONAL_MOBILITY", label: "Mobilidade pessoal", group: "Veículos e mobilidade", examples: "Bicicleta, patinete elétrico" },

  // Tecnologia e eletrônicos
  { value: "ELECTRONICS_COMPUTER", label: "Computador / notebook", group: "Tecnologia e eletrônicos" },
  { value: "ELECTRONICS_PHONE", label: "Celular / tablet", group: "Tecnologia e eletrônicos" },
  { value: "ELECTRONICS_PHOTO_VIDEO", label: "Foto / vídeo", group: "Tecnologia e eletrônicos", examples: "Câmera, lente, drone" },
  { value: "ELECTRONICS_AUDIO", label: "Áudio", group: "Tecnologia e eletrônicos", examples: "Caixas, interface, microfone" },
  { value: "ELECTRONICS_GAMING", label: "Games / consoles", group: "Tecnologia e eletrônicos" },
  { value: "ELECTRONICS_OTHER", label: "Outro eletrônico relevante", group: "Tecnologia e eletrônicos" },

  // Ferramentas, máquinas e produção
  { value: "TOOLS", label: "Ferramentas", group: "Ferramentas e produção", examples: "Furadeira, parafusadeira, serra" },
  { value: "MACHINERY", label: "Máquinas e equipamentos", group: "Ferramentas e produção", examples: "CNC, torno, compressor" },
  { value: "MAKER_EQUIPMENT", label: "Equipamentos maker / fabricação", group: "Ferramentas e produção", examples: "Impressora 3D, laser, plotter" },
  { value: "AGRICULTURAL_EQUIPMENT", label: "Máquinas / implementos agrícolas", group: "Ferramentas e produção" },
  { value: "PROFESSIONAL_EQUIPMENT", label: "Equipamento profissional", group: "Ferramentas e produção", examples: "Odontológico, estética, oficina" },
  { value: "SOLAR_ENERGY_EQUIPMENT", label: "Energia / geração", group: "Ferramentas e produção", examples: "Placas solares, inversores, gerador" },

  // Casa e escritório
  { value: "FURNITURE", label: "Móveis relevantes", group: "Casa e escritório", examples: "Sofá, mesa, armário planejado" },
  { value: "APPLIANCES", label: "Eletrodomésticos relevantes", group: "Casa e escritório", examples: "Geladeira, lava e seca, ar-condicionado" },
  { value: "OFFICE_EQUIPMENT", label: "Equipamentos de escritório", group: "Casa e escritório", examples: "Impressora, nobreak, servidor" },
  { value: "HOME_AUTOMATION_SECURITY", label: "Automação / segurança", group: "Casa e escritório", examples: "Câmeras, central, fechaduras" },

  // Bens de valor e colecionáveis
  { value: "JEWELRY_WATCHES", label: "Joias / relógios", group: "Bens de valor" },
  { value: "ART_COLLECTIBLES", label: "Arte / colecionáveis", group: "Bens de valor" },
  { value: "MUSICAL_INSTRUMENTS", label: "Instrumentos musicais", group: "Bens de valor" },
  { value: "SPORTS_EQUIPMENT", label: "Equipamentos esportivos de valor", group: "Bens de valor" },

  // Participações e direitos
  { value: "CORPORATE_SHARE", label: "Participação societária", group: "Participações e direitos" },
  { value: "COOPERATIVE_CAPITAL", label: "Cota capital / cooperativa", group: "Participações e direitos" },
  { value: "INTANGIBLE", label: "Marca / patente / direito", group: "Participações e direitos" },
  { value: "DIGITAL_ASSET", label: "Ativo digital não financeiro", group: "Participações e direitos", examples: "Domínio, software, licença transferível" },

  // Outros
  { value: "OTHER", label: "Outro bem patrimonial", group: "Outros" },
];

export const ASSET_CATEGORY_GROUPS = Array.from(new Set(ASSET_CATEGORY_OPTIONS.map((item) => item.group)));

export const ASSET_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  ASSET_CATEGORY_OPTIONS.map((item) => [item.value, item.label])
);
