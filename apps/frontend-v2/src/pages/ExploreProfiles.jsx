import { useLocation } from "react-router-dom";
import { CardGrid, GridSkeleton } from "../components/cards";
import { RouteTabs } from "../components/Tabs";
import { Empty, ErrorState, PageHeader } from "../components/ui";
import { queryProfilesByEarnings, queryProfilesByTradeCount } from "../lib/api";
import { useAsync, useDocumentTitle } from "../lib/hooks";

export default function ExploreProfiles() {
  useDocumentTitle("Creators");
  const earnings = useLocation().pathname.endsWith("/earnings");
  const result = useAsync(earnings ? "profiles:earnings" : "profiles:active", () =>
    earnings ? queryProfilesByEarnings() : queryProfilesByTradeCount()
  );

  return (
    <div className="container page">
      <PageHeader eyebrow="Explore" title="Creators & collectors">
        {earnings ? "Ranked by sales and royalties earned." : "Ranked by number of trades."}
      </PageHeader>
      <RouteTabs
        label="Profile rankings"
        tabs={[
          { to: "/profiles", label: "Most active", replace: true },
          { to: "/profiles/earnings", label: "Top earners", replace: true },
        ]}
      />
      {result.status === "loading" && <GridSkeleton kind="profile" count={9} />}
      {result.status === "error" && <ErrorState error={result.error} onRetry={result.reload} />}
      {result.status === "ok" && (
        <CardGrid items={result.data} kind="profile" pageSize={30} ranked empty={<Empty title="No profiles yet" />} />
      )}
    </div>
  );
}
