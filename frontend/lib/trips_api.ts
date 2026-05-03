import axios from "axios";
import { get_api_base } from "@/lib/auth_api";

export type trip_member = {
  uid: string;
  displayName: string;
  photoURL: string | null;
};

export type trip_list_item = {
  tripId: string;
  title: string;
  destination: string;
  coverPhotoURL?: string | null;
  status: string;
  memberUIDs?: string[];
  adminUID?: string;
  startDate?: unknown;
  endDate?: unknown;
  currency?: string;
  budgetTotal?: number | null;
  budgetStyle?: string;
  destinationCoords?: { latitude: number; longitude: number } | null;
  isPublic?: boolean;
  /** Saved at create; optional on older trips. */
  plannedMemberCount?: number | null;
  members?: trip_member[];
};

export type trip_detail = trip_list_item;

export async function fetch_trips_list(
  id_token: string,
  status?: "planning" | "ongoing" | "completed"
): Promise<trip_list_item[]> {
  const { data } = await axios.get<{ success?: boolean; data?: trip_list_item[] }>(
    `${get_api_base()}/v1/trips`,
    {
      headers: { Authorization: `Bearer ${id_token}` },
      params: status ? { status } : {},
      timeout: 25_000,
    }
  );
  const list = data?.data;
  if (!Array.isArray(list)) return [];
  return list;
}

export async function fetch_trip(id_token: string, trip_id: string): Promise<trip_detail> {
  const { data } = await axios.get<{ success?: boolean; data?: trip_detail }>(
    `${get_api_base()}/v1/trips/${encodeURIComponent(trip_id)}`,
    {
      headers: { Authorization: `Bearer ${id_token}` },
      timeout: 25_000,
    }
  );
  const trip = data?.data;
  if (!trip || typeof trip.tripId !== "string") throw new Error("Trip not found.");
  return trip;
}

export async function post_trip_invite(
  id_token: string,
  trip_id: string,
  invited_email: string
): Promise<void> {
  await axios.post(
    `${get_api_base()}/v1/trips/${encodeURIComponent(trip_id)}/invite`,
    { invitedEmail: invited_email.trim() },
    {
      headers: { Authorization: `Bearer ${id_token}` },
      timeout: 20_000,
    }
  );
}

export type budget_style_type = "backpacker" | "mid_range" | "luxury";

export type create_trip_payload = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: string;
  budgetTotal?: number;
  budgetStyle: budget_style_type;
  isPublic: boolean;
  /** Planned headcount including creator (1–99). */
  plannedMemberCount?: number;
};

export type create_trip_response = {
  success?: boolean;
  data?: { tripId: string } & Record<string, unknown>;
};

export async function create_trip(
  id_token: string,
  payload: create_trip_payload
): Promise<{ tripId: string }> {
  const { data } = await axios.post<create_trip_response>(`${get_api_base()}/v1/trips`, payload, {
    headers: { Authorization: `Bearer ${id_token}` },
    timeout: 35_000,
  });
  const trip = data?.data;
  const trip_id = trip && typeof trip.tripId === "string" ? trip.tripId : null;
  if (!trip_id) throw new Error("Create trip response missing tripId.");
  return { tripId: trip_id };
}
