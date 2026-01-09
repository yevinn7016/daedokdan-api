// src/repositories/placesCacheRepository.ts
import { supabase } from '../core/db';

export type CachedPlace = {
  place_id: string;
  name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

export async function upsertPlaces(places: Array<{ placeId: string; name: string; address: string; lat: number; lng: number }>) {
  if (!places.length) return;

  const rows = places.map((p) => ({
    place_id: p.placeId,
    name: p.name,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    provider: "kakao",
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("places_cache").upsert(rows, { onConflict: "place_id" });
  if (error) throw error;
}

export async function getPlaceById(placeId: string): Promise<CachedPlace | null> {
  const { data, error } = await supabase
    .from("places_cache")
    .select("place_id, name, address, lat, lng")
    .eq("place_id", placeId)
    .maybeSingle();

  if (error) throw error;
  return (data as CachedPlace | null) ?? null;
}
