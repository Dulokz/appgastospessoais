"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getOnboardingState } from "@/lib/actions/db-actions";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(pathname === "/onboarding");

  useEffect(() => {
    let active = true;

    if (pathname === "/onboarding") {
      setReady(true);
      return () => {
        active = false;
      };
    }

    setReady(false);
    getOnboardingState()
      .then((state) => {
        if (!active) return;

        // O uso normal do sistema só é liberado quando a posição inicial foi concluída.
        // SKIPPED não é tratado como concluído: a base patrimonial precisa existir primeiro.
        if (state.status !== "COMPLETED") {
          router.replace("/onboarding");
          return;
        }

        setReady(true);
      })
      .catch(() => {
        if (active) router.replace("/onboarding");
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Validando sua posição inicial...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
