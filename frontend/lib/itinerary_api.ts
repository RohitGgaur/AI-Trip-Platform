import axios from "axios";
import { get_api_base } from "@/lib/auth_api";

export type itinerary_activity = {
  time: string;
  title: string;
  description?: string;
  locationName?: string;
  category: string;
  estimatedCost?: number;
  coords?: { latitude: number; longitude: number } | null;
};

export type itinerary_day = {
  dayId: string;
  dayNumber: number;
  date?: unknown;
  title?: string;
  activities?: itinerary_activity[];
  aiGenerated?: boolean;
};

export async function fetch_itinerary(
  id_token: string,
  trip_id: string
): Promise<itinerary_day[]> {
  const { data } = await axios.get<{ success?: boolean; data?: itinerary_day[] }>(
    `${get_api_base()}/v1/trips/${encodeURIComponent(trip_id)}/itinerary`,
    {
      headers: { Authorization: `Bearer ${id_token}` },
      timeout: 25_000,
    }
  );
  const list = data?.data;
  return Array.isArray(list) ? list : [];
}
