import prisma from "../database/prisma";

/**
 * Prisma Transaction Type
 *
 * Represents a Prisma transaction client that excludes connection/disconnection
 * methods. This type is extracted from Prisma's transaction callback parameter
 * to ensure type safety when passing transaction clients to repository methods.
 *
 * Usage:
 * ```typescript
 * await prisma.$transaction(async (tx: PrismaTransaction) => {
 *   await tx.table.create({...});
 *   await tx.table.update({...});
 * });
 * ```
 *
 * The type is inferred from the actual Prisma client instance, ensuring
 * compatibility with all Prisma extensions and customizations.
 */
type TransactionCallback = Parameters<typeof prisma.$transaction>[0];
export type PrismaTransaction = TransactionCallback extends (
  tx: infer T,
) => Promise<infer _R>
  ? T
  : TransactionCallback extends (tx: infer T) => infer _R
    ? T
    : never;
