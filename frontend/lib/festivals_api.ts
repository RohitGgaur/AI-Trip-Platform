import axios from "axios";
import { get_api_base } from "@/lib/auth_api";

export type festival_row = {
  name: string;
  description: string;
  date: string;
  day: number;
  month: number;
  year: number;
  type: string[];
  states: string[];
  urlid?: string;
};

/**
 * Loads India holidays for a year; optional state matches backend filtering.
 * Category (`type`) filtering is done on the client so labels like Harvest/Cultural map reliably.
 */
export async function fetch_festivals(
  id_token: string,
  params: { year: number; state?: string | null }
): Promise<festival_row[]> {
  const { data } = await axios.get<{ success?: boolean; data?: festival_row[] }>(
    `${get_api_base()}/v1/festivals`,
    {
      headers: { Authorization: `Bearer ${id_token}` },
      params: {
        year: params.year,
        ...(params.state ? { state: params.state } : {}),
      },
      timeout: 25_000,
    }
  );
  return Array.isArray(data?.data) ? data.data : [];
}

export type festival_insight_travel = {
  crowd_level: string;
  pricing_booking: string;
  transport: string;
  safety_other: string;
};

export type festival_insight_payload = {
  description: string;
  best_celebrated_in: string;
  states_summary: string;
  travel_impact: festival_insight_travel;
  highlights: string[];
  footer_tip: string;
};

export type festival_insight_response = {
  insight: festival_insight_payload;
  states: string[];
};

/**
 * Gemini-generated detail for a festival (travel impact, highlights, etc.).
 * Backend may also return cached insight for the same name/date/states.
 */
export async function post_festival_insight(
  id_token: string,
  body: {
    name: string;
    date: string;
    description?: string;
    type?: string[];
    states?: string[];
  }
): Promise<festival_insight_response> {
  const { data } = await axios.post<{ success?: boolean; data?: festival_insight_response }>(
    `${get_api_base()}/v1/festivals/insight`,
    body,
    {
      headers: { Authorization: `Bearer ${id_token}` },
      timeout: 60_000,
    }
  );
  if (!data?.data?.insight) {
    throw new Error("No insight returned.");
  }
  return data.data;
}
