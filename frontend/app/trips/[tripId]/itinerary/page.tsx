import { TripItineraryTab } from "@/components/trip_itinerary_tab";

type PageProps = { params: Promise<{ tripId: string }> };

export default async function TripItineraryPage({ params }: PageProps) {
  const { tripId } = await params;
  return <TripItineraryTab trip_id={tripId} />;
}
