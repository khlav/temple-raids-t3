"use client";

import {Card, CardContent, CardHeader} from "~/components/ui/card";
import Link from "next/link";
import React from "react";

export default function DashboardBanner() {
  const loot_prio_url = "https://docs.google.com/spreadsheets/d/1OBcFgT1AXiPL3eW7x3yUx6EjsopPLlFMclph2OGRkXU/edit?gid=0#gid=0";
  const raid_policy_channel_url = "https://discord.com/channels/1132586324264759390/1194046879508480100";

  return (
    <div className="pb-2">
      <Card className="text-sm">
        <CardHeader className="p-4 pb-0">
          <div className="flex flex-row">
            <div className="grow-0 font-bold text-primary">
              Please Read: Temple Raid Attendance & Loot Policy
            </div>
            {/*<div className="grow pl-2 text-sm">*/}
            {/*  {" - "}*/}
            {/*  <a href={loot_prio_url} target="_blank" className="text-blue-500 hover:underline">*/}
            {/*    Read the full loot & raid policy here.*/}
            {/*  </a>*/}
            {/*</div>*/}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            <div>
              Raiders must maintain 50%+ large raid attendance over 6 lockout weeks
              to roll on{" "}
              <Link
                href={loot_prio_url}
                target="_blank"
                className="text-secondary-foreground hover:underline"
              >
                specific Naxx gear
              </Link>.
            </div>
            <div>
              In practice, this means raiders must participate in ~1.5 different 40-player raids (in different zones) on average each week to stay eligible.
            </div>
            <div className="pt-2">
              Note: If a raid is full, you can earn credit by being ready/available at raid time and contacting an officer.
            </div>
            <div>
              <Link
                className="text-blue-500 hover:text-secondary-foreground hover:underline"
                href={raid_policy_channel_url}
                target="_blank"
              >
                Learn more in Discord: <strong>Temple &gt; #raid-policies</strong>
              </Link>
            </div>
            {/*<div className="pt-2">*/}
            {/*  <strong>How it works: </strong>*/}
            {/*  Raiders earn up to three (3) raid credits per week toward*/}
            {/*  attendance.*/}
            {/*</div>*/}
            {/*<ul className="list-disc pl-6">*/}
            {/*  <li>*/}
            {/*    AQ40, Naxx, and BWL each grant +1 credit (max once per zone per*/}
            {/*    week)*/}
            {/*  </li>*/}
            {/*  <li>MC grants +1/2 credit (max once per week)</li>*/}
            {/*</ul>*/}
            {/*<div className="pt-2">*/}
            {/*  Your % attendance over 6 weeks is your total credits divided by 18*/}
            {/*  (3 per week, 6 weeks).*/}
            {/*</div>*/}
            {/*<div className="text-xs italic pt-2">*/}
            {/*  Note: Alts count towards your overall attendance as a player. Check the{" "}*/}
            {/*  <Link*/}
            {/*    href="/characters"*/}
            {/*    className="text-secondary-foreground hover:underline"*/}
            {/*  >*/}
            {/*    players*/}
            {/*  </Link>{" "}*/}
            {/*  list for raiding character associations, and talk to an officer for updates.*/}
            {/*</div>*/}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
