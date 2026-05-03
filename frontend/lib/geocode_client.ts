import axios from "axios";
import { get_api_base } from "@/lib/auth_api";

export type geocode_hit = { displayName: string; latitude: number; longitude: number };

export async function geocode_query_authed(
  id_token: string,
  query: string
): Promise<{ latitude: number; longitude: number } | null> {
  const q = query.trim();
  if (q.length < 2) return null;
  const { data } = await axios.get<{ success?: boolean; data?: geocode_hit[] }>(
    `${get_api_base()}/v1/external/geocode`,
    {
      params: { q },
      headers: { Authorization: `Bearer ${id_token}` },
      timeout: 12_000,
    }
  );
  const first = data?.data?.[0];
  if (!first || typeof first.latitude !== "number" || typeof first.longitude !== "number") return null;
  return { latitude: first.latitude, longitude: first.longitude };
}
