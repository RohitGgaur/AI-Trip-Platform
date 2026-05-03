import { TripTabBar } from "@/components/trip_tab_bar";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
};

export default async function TripIdLayout({ children, params }: LayoutProps) {
  const { tripId } = await params;
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
      <TripTabBar trip_id={tripId} />
      <div className="min-h-0 w-full flex-1">{children}</div>
    </div>
  );
}
