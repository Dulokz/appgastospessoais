import { OnboardingWizard } from "./OnboardingWizard";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <div className="py-8 px-4">
      <OnboardingWizard />
    </div>
  );
}
