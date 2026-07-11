const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function fnUrl(name: string) {
  return `${BASE}/functions/v1/${name}`;
}

export function fnHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: ANON,
    Authorization: `Bearer ${ANON}`,
  };
}
