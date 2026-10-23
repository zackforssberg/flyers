import Link from "next/link";
import { strings } from "@/lib/strings";

const NAV_ITEMS = [
  { href: "/", label: strings.nav.home },
  { href: "/matcher", label: strings.nav.matches },
  { href: "/poang", label: strings.nav.points },
  { href: "/utvisningar", label: strings.nav.penalties },
];

export function SiteHeader() {
  return (
    <header className="bg-flyers-blue text-white shadow-sm">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          {strings.siteName}
        </Link>
        <nav aria-label="Huvudmeny">
          <ul className="flex gap-1 overflow-x-auto text-sm font-medium">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block whitespace-nowrap rounded-full px-3 py-2 transition-colors hover:bg-white/15"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
