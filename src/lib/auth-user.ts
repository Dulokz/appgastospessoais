import { db } from "@/lib/db";

// TODO: Substituir por AuthJS / Supabase Auth antes da implantação multiusuário em produção.
// Atualmente, este helper centraliza a obtenção do usuário principal para o aplicativo pessoal,
// garantindo que nenhuma consulta faça findFirst() genérico sem isolamento por userId.

export const DEFAULT_USER_EMAIL = "usuario@patrimonio.com";

export async function getDefaultUserId(): Promise<string> {
  const user = await db.user.findFirst({
    where: { email: DEFAULT_USER_EMAIL },
  });

  if (user) return user.id;

  const newUser = await db.user.create({
    data: {
      name: "Usuário Principal",
      email: DEFAULT_USER_EMAIL,
    },
  });

  return newUser.id;
}
