import Link from "next/link";

const accent = "#FF6B4A";

type variant_type = "home" | "product" | "purpose";

const seasons = [
  {
    months: "October – November",
    travel: "Clear skies across most of India—ideal for Rajasthan palaces, Gujarat heritage circuits, and the Himalayas before heavy winter snow.",
    festivals: "Diwali lights pan-India, Durga Puja in West Bengal, Navratri in Gujarat—crowds and hotel demand spike; book early.",
  },
  {
    months: "December – February",
    travel: "North Indian plains stay mild; deserts of Rajasthan and Rann of Kutch are comfortable. Goa and Kerala shine for winter sun and coast.",
    festivals: "Christmas & New Year coast-wide; Lohri (Punjab), Pongal (Tamil Nadu), Bihu (Assam)—harvest season and regional colour.",
  },
  {
    months: "March – April",
    travel: "Spring before peak heat—great for hill stations picking up, and North/Central India before summer.",
    festivals: "Holi across Braj, Rajasthan, and cities nationwide; Good Friday & Easter where observed—plan stays around festival dates.",
  },
  {
    months: "May – June",
    travel: "Plains turn hot—Himachal, Uttarakhand, and the Northeast hills are natural escapes; book stays early for summer rush.",
    festivals: "Eid and regional summer fairs vary by state—check the calendar before locking routes.",
  },
  {
    months: "July – September",
    travel: "Monsoon greens the Western Ghats and Kerala; Goa is quieter. Carry flexibility for rain delays on road trips.",
    festivals: "Onam in Kerala; Raksha Bandhan & Janmashtami widely; Ganesh Chaturthi especially strong in Maharashtra.",
  },
];

type props = {
  variant?: variant_type;
};

export function MarketingFestivalCalendarSection({ variant = "home" }: props) {
  const tight = variant !== "home";

  return (
    <section
      className={
        tight
          ? "rounded-3xl border border-[#0b1628]/08 bg-gradient-to-br from-white via-[#f4f6fa] to-[#FF6B4A]/[0.06] p-8 shadow-sm md:p-10"
          : "border-y border-[#0b1628]/08 bg-[#f8fafc] px-4 py-20 text-[#0b1628] sm:px-6 md:py-24"
      }
      aria-labelledby="festival-calendar-heading"
    >
      <div className={tight ? "" : "mx-auto max-w-6xl"}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: accent }}>
          India festival calendar
        </p>
        <h2
          id="festival-calendar-heading"
          className="landing_serif mt-4 max-w-3xl text-2xl font-semibold tracking-tight md:text-[2.1rem]"
        >
          Know which months suit which region—and what festivals shape the trip.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#0b1628]/72 md:text-base">
          India changes by season: weather, crowds, and prices move with festivals and holidays. Below is a practical
          snapshot—then, inside Yatrify, our signed-in{" "}
          <strong className="font-semibold text-[#0b1628]">India Festival Calendar</strong> lists real dates by state,
          with filters for national, religious, harvest, and cultural days so you can plan routes and bookings around
          peak moments—not surprise them.
        </p>

        <div className={`mt-10 grid gap-5 ${tight ? "sm:grid-cols-1 lg:grid-cols-2" : "md:grid-cols-2"}`}>
          {seasons.map((row) => (
            <article
              key={row.months}
              className="rounded-2xl border border-[#0b1628]/10 bg-white/90 p-6 shadow-sm transition hover:border-[#FF6B4A]/25"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF6B4A]">{row.months}</p>
              <h3 className="landing_serif mt-2 text-lg font-semibold text-[#0b1628]">Where it shines</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#0b1628]/70">{row.travel}</p>
              <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#0b1628]/45">Festivals & mood</h4>
              <p className="mt-1.5 text-sm leading-relaxed text-[#0b1628]/72">{row.festivals}</p>
            </article>
          ))}
        </div>

        <div
          className={`mt-10 flex flex-col items-start gap-4 rounded-2xl border border-[#0b1628]/10 bg-[#0b1628]/[0.03] p-6 md:flex-row md:items-center md:justify-between md:p-8`}
        >
          <p className="max-w-xl text-sm leading-relaxed text-[#0b1628]/75">
            Sign in to open the live calendar: filter by <strong className="text-[#0b1628]">state</strong>,{" "}
            <strong className="text-[#0b1628]">month</strong>, and{" "}
            <strong className="text-[#0b1628]">festival type</strong>, switch calendar or list view, and tap a day for
            travel-friendly notes—so your crew picks dates with eyes open.
          </p>
          <Link
            href="/login"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#0b1628] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#132038]"
          >
            Sign in for festival calendar
          </Link>
        </div>
      </div>
    </section>
  );
}
