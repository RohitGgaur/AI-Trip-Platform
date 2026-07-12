import axios from "axios";
import { get_api_base } from "@/lib/auth_api";

export type train_entry = {
  train_number: string;
  train_name: string;
  departure: string;
  arrival: string;
  duration: string;
  run_days?: string[];
  from_stn?: string;
  to_stn?: string;
  classes: string[];
  fares: Record<string, number>;
  estimated?: boolean;
};

export type train_result = {
  source: "irctc" | "estimated";
  from_code?: string;
  to_code?: string;
  note?: string;
  total?: number;
  trains: train_entry[];
};

export type bus_option = {
  type: string;
  fare: number;
  duration_h: number;
  note: string;
};

export type cab_option = {
  type: string;
  fare: number;
  duration_h: number;
  note: string;
  per: string;
};

export type flight_offer = {
  airline: string;
  fare: number;
  currency: string;
  stops: number;
  duration?: string;
  departure?: string;
  arrival?: string;
  cabin: string;
  note?: string;
};

export type flight_result = {
  source: "amadeus" | "estimated";
  available: boolean;
  origin?: string;
  destination?: string;
  note?: string;
  offers: flight_offer[];
};

export type booking_links = {
  irctc: string;
  redbus: string;
  uber: string;
  ola: string;
};

export type transport_result = {
  from: string;
  to: string;
  aerial_km: number;
  road_km: number;
  date: string;
  trains: train_result;
  buses: bus_option[];
  cabs: cab_option[];
  flights: flight_result;
  booking_links: booking_links;
};

export async function fetch_transport(
  id_token: string,
  from: string,
  to: string,
  date?: string
): Promise<transport_result> {
  const params: Record<string, string> = { from, to };
  if (date) params.date = date;

  const { data } = await axios.get<{ success: boolean; data: transport_result }>(
    `${get_api_base()}/v1/transport/search`,
    {
      headers: { Authorization: `Bearer ${id_token}` },
      params,
    }
  );
  return data.data;
}
