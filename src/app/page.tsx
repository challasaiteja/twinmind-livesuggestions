"use client";

import dynamic from "next/dynamic";

const ClientApp = dynamic(() => import("@/components/ClientApp"), {
  ssr: false,
  loading: () => <div className="h-screen bg-[#111113]" />,
});

export default function Home() {
  return <ClientApp />;
}
