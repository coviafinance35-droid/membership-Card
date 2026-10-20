import { PublicKey } from "@solana/web3.js";

export const SOLANA_TREASURY = process.env.SOLANA_TREASURY ?? "GfoFdkeJiPrYZuCgTLPxgWdWmh8NoB4QCc2CjhLfspFX";
export const SOLANA_NETWORK = "mainnet-beta" as const;

export function createSolanaPayUrl(input: { amountSol: number; reference: string; label?: string }) {
  const params = new URLSearchParams({ amount: input.amountSol.toFixed(9), reference: input.reference, label: input.label ?? "MemberCard AI", message: "Physical membership card" });
  return `solana:${SOLANA_TREASURY}?${params.toString()}`;
}

export function isValidSolanaAddress(value: string) {
  try { new PublicKey(value); return true; } catch { return false; }
}
