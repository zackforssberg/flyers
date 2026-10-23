"use client";

import Link from "next/link";
import { strings } from "@/lib/strings";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-4 py-10 text-center">
      <p className="text-flyers-muted">{strings.common.loadError}</p>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-flyers-blue px-4 py-2 font-semibold text-white"
        >
          Försök igen
        </button>
        <Link href="/" className="rounded-lg border border-flyers-blue px-4 py-2 font-semibold text-flyers-blue">
          {strings.common.goHome}
        </Link>
      </div>
    </div>
  );
}
