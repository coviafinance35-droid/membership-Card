import { db } from "@/lib/db";
import { membershipCards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const MEMBERSHIP_ID_PATTERN = /^MC-\d{4}-\d{3}$/;

export function isValidMembershipId(value: string) {
  return MEMBERSHIP_ID_PATTERN.test(value.trim().toUpperCase());
}

export async function createUniqueMembershipId() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const year = new Date().getFullYear();
    const suffix = Math.floor(100 + Math.random() * 900);
    const candidate = `MC-${year}-${suffix}`;
    const existing = await db.select({ id: membershipCards.id }).from(membershipCards).where(eq(membershipCards.publicMembershipId, candidate)).limit(1);
    if (!existing.length) return candidate;
  }
  throw new Error("Could not allocate a unique membership ID");
}

function normalizeExpiration(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

export async function saveMembershipCard(card: {
  organizationName: string;
  memberName: string;
  membershipType: string;
  memberNumber: string;
  expiration: string | null;
  photoDataUrl: string | null;
  design: unknown;
}) {
  if (!isValidMembershipId(card.memberNumber)) throw new Error("Invalid membership ID");
  const expiration = normalizeExpiration(card.expiration);
  const [saved] = await db.insert(membershipCards).values({
    publicMembershipId: card.memberNumber,
    organizationName: card.organizationName,
    memberName: card.memberName,
    membershipType: card.membershipType,
    expirationDate: expiration,
    photoDataUrl: card.photoDataUrl,
    design: card.design,
  }).onConflictDoUpdate({
    target: membershipCards.publicMembershipId,
    set: {
      organizationName: card.organizationName,
      memberName: card.memberName,
      membershipType: card.membershipType,
      expirationDate: expiration,
      photoDataUrl: card.photoDataUrl,
      design: card.design,
      updatedAt: new Date(),
    },
  }).returning({ id: membershipCards.id, publicMembershipId: membershipCards.publicMembershipId });
  return { id: saved.id, public_membership_id: saved.publicMembershipId };
}
