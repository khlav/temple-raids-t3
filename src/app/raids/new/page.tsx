"use server";

import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import {CreateRaid} from "~/components/raids/create-raid";
import {redirect} from "next/navigation";

export default async function RaidNewPage() {
  const session = await auth();

  const sampleLinks = [
    "https://vanilla.warcraftlogs.com/reports/kY1KV3jMgPzQaXFW",
    "https://vanilla.warcraftlogs.com/reports/d3YDbmJq9RGtpPMj",
    "https://vanilla.warcraftlogs.com/reports/TBPp7gZ8Ykdv3Cr1",
    "https://vanilla.warcraftlogs.com/reports/dWL8TKrRFD9jkvAb",
    "https://vanilla.warcraftlogs.com/reports/vVw7CH2RDc6tn4Pb",
  ];

  if(!session?.user?.isAdmin) {
    redirect('/raids');
  }

  return (
    <HydrateClient>
      <main className="w-full px-4">
        <div className="h-auto w-full pb-2">
          <CreateRaid />
        </div>
        {sampleLinks.map((link, i) => (
          <div className="text-xs text-secondary" key={link}> {link} </div>
        ))}
      </main>
    </HydrateClient>
  );
}
