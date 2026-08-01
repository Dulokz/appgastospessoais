import { Settings, Shield, User, Database, Lock } from "lucide-react";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Configurações & Perfil</h1>
        <p className="text-xs text-muted-foreground">Preferências do usuário, isolamento de dados e segurança multi-tenant</p>
      </div>

      <div className="glass-card p-6 rounded-2xl space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20">
            UP
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Usuário Principal</h3>
            <p className="text-xs text-muted-foreground">usuario@patrimonio.com</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
              ID Isolado: usr_86cf5f99
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="font-bold text-white">Isolamento Multi-tenant (userId)</p>
                <p className="text-muted-foreground">Garantia de privacidade e segregação de dados contábeis</p>
              </div>
            </div>
            <span className="text-emerald-400 font-semibold">Ativo</span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="font-bold text-white">Banco de Dados Relacional</p>
                <p className="text-muted-foreground">PostgreSQL com suporte a precisão Decimal (18,4)</p>
              </div>
            </div>
            <span className="text-cyan-400 font-semibold">PostgreSQL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
