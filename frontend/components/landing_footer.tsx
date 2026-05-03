import Link from "next/link";

const primary = "#FF6B4A";
const secondary = "#0b1628";

export function LandingFooter() {
  return (
    <footer
      className="landing_sans border-t border-white/10 text-white"
      style={{ backgroundColor: secondary }}
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="landing_serif text-2xl font-semibold tracking-tight">
              <span style={{ color: primary }}>Y</span>atrify
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">
              Plan trips with your crew—one calm place for itineraries, costs, and memories.
            </p>
            <div className="mt-6 flex gap-4">
              <a
                href="#"
                aria-label="Instagram"
                className="rounded-full border border-white/15 p-2 text-white/80 transition hover:border-[#FF6B4A]/50 hover:text-[#FF6B4A]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153.555.555.9 1.11 1.153 1.772.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 01-1.153 1.772 4.897 4.897 0 01-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.895 4.895 0 01-1.772-1.153 4.898 4.898 0 01-1.153-1.772c-.248-.637-.415-1.363-.465-2.428-.047-1.066-.06-1.405-.06-4.122 0-2.717.01-3.056.06-4.122.05-1.065.217-1.79.465-2.428.254-.66.598-1.216 1.153-1.772.555-.555 1.11-.9 1.772-1.153.637-.247 1.363-.415 2.428-.465 1.066-.047 1.405-.06 4.122-.06zm0 1.802c-2.67 0-2.986.012-4.04.059-.976.045-1.505.207-1.858.344-.466.182-.8.398-1.15.748-.35.35-.566.684-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.055-.06 1.37-.06 4.04 0 2.67.012 2.986.06 4.04.045.976.207 1.505.344 1.858.182.466.399.8.748 1.15.35.35.684.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.06 4.04.06 2.67 0 2.987-.012 4.04-.06.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.684.748-1.15.137-.353.3-.882.344-1.857.048-1.055.06-1.37.06-4.04 0-2.67-.012-2.986-.06-4.04-.045-.976-.207-1.505-.344-1.858-.182-.466-.399-.8-.748-1.15-.35-.35-.684-.566-1.15-.748-.353-.137-.882-.3-1.857-.344-1.054-.048-1.37-.06-4.04-.06zm0 3.063a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 8.468a3.333 3.333 0 100-6.666 3.333 3.333 0 000 6.666zm6.538-8.671a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="X"
                className="rounded-full border border-white/15 p-2 text-white/80 transition hover:border-[#FF6B4A]/50 hover:text-[#FF6B4A]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF6B4A]/90">Explore</p>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              <li>
                <Link href="/" className="transition hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/purpose" className="transition hover:text-white">
                  Purpose
                </Link>
              </li>
              <li>
                <Link href="/product" className="transition hover:text-white">
                  Our product
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition hover:text-white">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition hover:text-white">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF6B4A]/90">Contact</p>
            <p className="mt-4 text-sm text-white/65">
              Building something better for group travel—questions welcome.
            </p>
            <a
              href="mailto:hello@yatrify.com"
              className="mt-3 inline-block text-sm font-semibold text-[#FF6B4A] transition hover:underline"
            >
              hello@yatrify.com
            </a>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/45 sm:flex-row">
          <p>© {new Date().getFullYear()} Yatrify. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/#" className="transition hover:text-white/70">
              Privacy
            </Link>
            <Link href="/#" className="transition hover:text-white/70">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
