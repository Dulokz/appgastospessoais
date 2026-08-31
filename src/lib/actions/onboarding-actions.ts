'use server';

import { getDefaultUserId } from '../auth-user';
import {
  OnboardingEngine,
  InitialAccountSetup,
  InitialAssetSetup,
  InitialLiabilitySetup,
} from '../services/onboarding/onboarding-engine';

/**
 * Server Action para configurar o onboarding do usuário com a data-base escolhida
 */
export async function setupUserOnboardingAction(params: {
  controlStartDate: Date;
  onboardingPath: 'MANUAL' | 'IMPORT';
  initialAccounts?: InitialAccountSetup[];
  initialAssets?: InitialAssetSetup[];
  initialLiabilities?: InitialLiabilitySetup[];
}) {
  try {
    const userId = await getDefaultUserId();

    const result = await OnboardingEngine.setupOnboarding({
      userId,
      ...params,
    });

    return result;
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao realizar setup de onboarding.' };
  }
}

/**
 * Server Action para atualizar a data-base de controle (controlStartDate)
 */
export async function updateControlStartDateAction(newDate: Date) {
  try {
    const userId = await getDefaultUserId();

    const user = await OnboardingEngine.updateControlStartDate(userId, newDate);

    return { success: true, controlStartDate: user.controlStartDate };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar data-base de controle.' };
  }
}

/**
 * Server Action para consultar o estado atual de onboarding do usuário
 */
export async function getOnboardingStateAction() {
  try {
    const userId = await getDefaultUserId();

    const user = await OnboardingEngine.getOnboardingState(userId);

    return { success: true, user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao buscar estado do onboarding.' };
  }
}
