import { TripTransportTab } from "@/components/trip_transport_tab";

type PageProps = {
  params: Promise<{ tripId: string }>;
};

export default async function TransportPage({ params }: PageProps) {
  const { tripId } = await params;
  return <TripTransportTab trip_id={tripId} />;
}
