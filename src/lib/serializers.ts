import { Prisma } from '@prisma/client';

/**
 * Utilitário para converter com segurança qualquer valor ou objeto Prisma.Decimal em JS number primitivo
 * garantindo compatibilidade 100% limpa com Client Components do Next.js sem avisos de serialização.
 */
export function serializeDecimal<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Prisma.Decimal) {
    return Number(obj) as any;
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDecimal) as any;
  }

  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      res[key] = serializeDecimal((obj as any)[key]);
    }
    return res;
  }

  return obj;
}
