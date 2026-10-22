import React from "react";
import { useParams } from "react-router-dom";
import { CardGrid, GridSkeleton } from "../components/cards";
import { useWallet } from "../components/Wallet";
import { Artwork, Button, Empty, ErrorState, PersonLink, Skeleton, Stat } from "../components/ui";
import CollectionDialog from "../dialogs/CollectionDialog";
import NotFound from "./NotFound";
import { getCollectionItems, getCollectionStats } from "../lib/api";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { loadCollection, loadProfile } from "../lib/models";
import { formatCompact, formatWhole } from "../lib/money";

export default function CollectionPage() {
  const { handle } = useParams();
  const { ensureWallet, isOwner } = useWallet();
  const [editing, setEditing] = React.useState(false);
  const result = useAsync(`collection-page:${handle}`, async () => {
    const collection = await loadCollection(handle);
    if (!collection) {
      return null;
    }
    const [owner, stats] = await Promise.all([loadProfile(collection.owner), getCollectionStats(handle)]);
    return { collection, owner, stats };
  });
  const items = useAsync(`items:${handle}`, () => getCollectionItems(handle));
  const data = result.data;
  useDocumentTitle(data?.collection.name || "Collection");

  if (result.status === "error") {
    return (
      <div className="container page">
        <ErrorState error={result.error} onRetry={result.reload} />
      </div>
    );
  }
  if (result.status === "ok" && data === null) {
    return <NotFound title="Collection not found">There's no collection called “{handle}”.</NotFound>;
  }

  const mine = data ? isOwner(data.collection.owner) : false;

  return (
    <div className="page">
      <section className="collection-hero">
        {data && (
          <div className="collection-hero-bg" aria-hidden="true">
            <Artwork address={data.collection.thumbnail} />
          </div>
        )}
        <div className="container collection-hero-row">
          <div className="collection-hero-cover">
            {data ? <Artwork address={data.collection.thumbnail} eager /> : <Skeleton className="fill" />}
          </div>
          <div className="collection-hero-info">
            <p className="eyebrow">Collection</p>
            <h1>{data ? data.collection.name : <Skeleton style={{ width: "12ch" }} />}</h1>
            {data && <PersonLink profile={data.owner} label="By" />}
            {data?.collection.description && <p className="collection-description">{data.collection.description}</p>}
            <dl className="stat-row">
              <Stat label="Items" value={data ? formatWhole(data.stats.count) : "–"} />
              <Stat label="Volume" value={data ? formatCompact(data.stats.tradeVolume) : "–"} hint="DINGO" />
              <Stat label="Trades" value={data ? formatWhole(data.stats.tradeCount) : "–"} />
            </dl>
          </div>
          {data && mine !== false && (
            <div className="collection-hero-actions">
              <Button variant="secondary" icon="pen" onClick={() => ensureWallet() && setEditing(true)}>
                Edit
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className="container">
        {items.status === "loading" && <GridSkeleton count={12} />}
        {items.status === "error" && <ErrorState error={items.error} onRetry={items.reload} />}
        {items.status === "ok" && (
          <CardGrid
            items={[...items.data].reverse()}
            empty={<Empty icon="grid" title="This collection is empty">Its creator hasn't added any NFTs yet.</Empty>}
          />
        )}
      </div>

      {data && (
        <CollectionDialog open={editing} onClose={() => setEditing(false)} collection={data.collection} onSaved={result.reload} />
      )}
    </div>
  );
}
