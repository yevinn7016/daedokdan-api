"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertPlaces = upsertPlaces;
exports.getPlaceById = getPlaceById;
// src/repositories/placesCacheRepository.ts
const db_1 = require("../core/db");
async function upsertPlaces(places) {
    if (!places.length)
        return;
    const rows = places.map((p) => ({
        place_id: p.placeId,
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        provider: "kakao",
        updated_at: new Date().toISOString(),
    }));
    const { error } = await db_1.supabase.from("places_cache").upsert(rows, { onConflict: "place_id" });
    if (error)
        throw error;
}
async function getPlaceById(placeId) {
    var _a;
    const { data, error } = await db_1.supabase
        .from("places_cache")
        .select("place_id, name, address, lat, lng")
        .eq("place_id", placeId)
        .maybeSingle();
    if (error)
        throw error;
    return (_a = data) !== null && _a !== void 0 ? _a : null;
}
