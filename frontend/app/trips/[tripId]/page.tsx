import { TripOverview } from "@/components/trip_overview";

type PageProps = {
  params: Promise<{ tripId: string }>;
};

export default async function TripOverviewPage({ params }: PageProps) {
  const { tripId } = await params;
  return <TripOverview trip_id={tripId} />;
}
