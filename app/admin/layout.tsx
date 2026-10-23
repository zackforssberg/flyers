import type { Metadata } from "next";
import { strings } from "@/lib/strings";

export const metadata: Metadata = {
  title: strings.admin.pageTitle,
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
