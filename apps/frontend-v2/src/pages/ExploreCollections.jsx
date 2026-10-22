import { useLocation } from "react-router-dom";
import { CardGrid, GridSkeleton } from "../components/cards";
import { RouteTabs } from "../components/Tabs";
import { Empty, ErrorState, PageHeader } from "../components/ui";
import { queryCollectionsByVolume, queryCollectionsTrending } from "../lib/api";
import { useAsync, useDocumentTitle } from "../lib/hooks";

export default function ExploreCollections() {
  useDocumentTitle("Collections");
  const top = useLocation().pathname.endsWith("/top");
  const result = useAsync(top ? "collections:top" : "collections:trending", () =>
    top ? queryCollectionsByVolume() : queryCollectionsTrending(9999)
  );

  return (
    <div className="container page">
      <PageHeader eyebrow="Explore" title="Collections">
        {top ? "Ranked by all-time trade volume." : "Ranked by recent trading activity."}
      </PageHeader>
      <RouteTabs
        label="Collection rankings"
        tabs={[
          { to: "/collections", label: "Trending", replace: true },
          { to: "/collections/top", label: "Top volume", replace: true },
        ]}
      />
      {result.status === "loading" && <GridSkeleton kind="collection" count={9} />}
      {result.status === "error" && <ErrorState error={result.error} onRetry={result.reload} />}
      {result.status === "ok" && (
        <CardGrid items={result.data} kind="collection" pageSize={18} empty={<Empty title="No collections yet" />} />
      )}
    </div>
  );
}
