import { OnboardingWizard } from "./OnboardingWizard";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <div className="py-8 px-4">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Onboarding Financeiro & Patrimonial</h1>
        <p className="text-xs text-muted-foreground">
          Defina sua posição de abertura inicial antes de começar a registrar movimentações diárias
        </p>
      </div>

      <OnboardingWizard />
    </div>
  );
}
