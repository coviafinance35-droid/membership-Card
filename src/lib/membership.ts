import { createServiceClient } from "@/lib/supabase/server";

const MEMBERSHIP_ID_PATTERN = /^MC-\d{4}-\d{3}$/;

export function isValidMembershipId(value: string) {
  return MEMBERSHIP_ID_PATTERN.test(value.trim().toUpperCase());
}

export async function createUniqueMembershipId() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const year = new Date().getFullYear();
    const suffix = Math.floor(100 + Math.random() * 900);
    const candidate = `MC-${year}-${suffix}`;
    const supabase = await createServiceClient();
    const { data, error } = await supabase.from("membership_cards").select("id").eq("public_membership_id", candidate).limit(1);
    if (error) throw error;
    if (!data?.length) return candidate;
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
  const supabase = await createServiceClient();
  const { data, error } = await supabase.from("membership_cards").upsert({
    public_membership_id: card.memberNumber,
    organization_name: card.organizationName,
    member_name: card.memberName,
    membership_type: card.membershipType,
    expiration_date: expiration,
    photo_data_url: card.photoDataUrl,
    design: card.design,
  }, { onConflict: "public_membership_id" }).select("id, public_membership_id").single();
  if (error) throw error;
  return data;
}
