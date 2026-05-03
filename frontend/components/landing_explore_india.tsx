import Image from "next/image";
import Link from "next/link";

const accent = "#FF6B4A";
const navy = "#0b1628";

type explore_place = {
  name: string;
  tag: string;
  caption: string;
  image_src: string;
  /** Tailwind gradient overlay tint over image */
  tint_class: string;
};

const places: explore_place[] = [
  {
    name: "Rajasthan",
    tag: "Heritage",
    caption: "Royal heritage & desert magic",
    image_src: "/images/explore/Rajasthan.jpg",
    tint_class: "from-[#FF6B4A]/55 via-orange-900/25 to-transparent",
  },
  {
    name: "Kerala",
    tag: "Nature",
    caption: "Backwaters & spice paradise",
    image_src: "/images/explore/kerala.jpg",
    tint_class: "from-emerald-900/50 via-teal-800/30 to-transparent",
  },
  {
    name: "Goa",
    tag: "Beaches",
    caption: "Beaches & vibrant culture",
    image_src: "/images/explore/goa.webp",
    tint_class: "from-[#FF6B4A]/45 via-rose-900/35 to-transparent",
  },
  {
    name: "Delhi",
    tag: "Heritage",
    caption: "Old lanes & modern rhythm",
    image_src: "/images/explore/Delhi.jpg",
    tint_class: "from-amber-950/45 via-[#0b1628]/40 to-transparent",
  },
  {
    name: "Gujarat",
    tag: "Culture",
    caption: "Crafts, coast & white desert",
    image_src: "/images/explore/gujarat.jpg",
    tint_class: "from-[#FF6B4A]/40 via-orange-950/35 to-transparent",
  },
  {
    name: "Uttarakhand",
    tag: "Nature",
    caption: "Himalayas & quiet valleys",
    image_src: "/images/explore/uttrakhand.jpg",
    tint_class: "from-emerald-950/50 via-slate-900/35 to-transparent",
  },
];

export function LandingExploreIndia() {
  return (
    <section
      id="explore-india"
      className="landing_sans scroll-mt-24 px-4 py-20 sm:px-6 md:py-28"
      style={{
        backgroundColor: navy,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='72' height='72' viewBox='0 0 72 72' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M36 8c-2 7-6 14-6 22s6 14 6 22 6 14 6 22-4 15-6 22c-2-7-6-14-6-22s6-14 6-22 6-14 6-22-4-15-6-22z' fill='%23FF6B4A' fill-opacity='0.05'/%3E%3C/svg%3E")`,
      }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="landing_serif text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-[2.35rem]">
            Explore{" "}
            <span style={{ color: accent }} className="font-semibold">
              Incredible India
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/72 md:text-lg">
            From heritage cities to pristine beaches, discover your perfect destination.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {places.map((place) => (
            <article
              key={place.name}
              className="group relative aspect-[16/11] overflow-hidden rounded-3xl border border-white/10 shadow-xl shadow-black/30 sm:aspect-[16/10]"
            >
              <Image
                src={place.image_src}
                alt={`${place.name} — ${place.caption}`}
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={place.name === "Rajasthan"}
              />
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${place.tint_class}`}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1628]/95 via-[#0b1628]/35 to-transparent"
                aria-hidden
              />

              <span className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                {place.tag}
              </span>

              <div className="absolute inset-x-0 bottom-0 p-5 pt-12">
                <h3 className="landing_serif text-xl font-semibold text-white sm:text-2xl">{place.name}</h3>
                <p className="mt-1 text-sm font-medium leading-snug text-white/85">{place.caption}</p>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-white/50">
          Photos from your library — destinations to inspire where Yatrify can take you next.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-semibold text-[#0b1628] transition hover:brightness-110"
            style={{ backgroundColor: accent }}
          >
            Plan a trip
          </Link>
        </div>
      </div>
    </section>
  );
}
