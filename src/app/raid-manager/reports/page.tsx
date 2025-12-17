import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { ReportBuilder } from "~/components/reports/report-builder";

export default async function ReportsPage() {
  const session = await auth();

  // Redirect if not a raid manager
  if (!session?.user?.isRaidManager) {
    redirect("/");
  }

  return (
    <main className="w-full px-4">
      <div className="mb-4">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Report Builder
        </h1>
        <p className="text-muted-foreground">
          Create flexible reports on raid attendance and character performance
        </p>
      </div>
      <ReportBuilder />
    </main>
  );
}
