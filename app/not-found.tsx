import Link from "next/link";
import { strings } from "@/lib/strings";

export default function NotFound() {
  return (
    <div className="space-y-3 py-16 text-center">
      <h1 className="text-2xl font-bold text-flyers-blue">{strings.common.notFoundTitle}</h1>
      <p className="text-flyers-muted">{strings.common.notFoundText}</p>
      <Link href="/" className="inline-block font-semibold text-flyers-blue underline">
        {strings.common.goHome}
      </Link>
    </div>
  );
}
