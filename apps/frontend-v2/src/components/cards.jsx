import React from "react";
import { Link } from "react-router-dom";
import { Artwork, Avatar, Skeleton } from "./ui";
import Icon from "./Icon";
import { useAsync, useVisible } from "../lib/hooks";
import { loadCollection, loadNft, loadProfile, nftTitle, shortAddress } from "../lib/models";
import { formatCompact, formatSats, formatWhole } from "../lib/money";
import {
  getCollectionStats,
  getProfileCollectionCount,
  getProfileCreatedCount,
  getProfileHistoricalCount,
} from "../lib/api";

// Cards load their own data once scrolled near, so long grids stay cheap.

export function NftCard({ address, footer }) {
  const [ref, visible] = useVisible();
  const nft = useAsync(visible ? `nft:${address}` : null, () => loadNft(address));
  const data = nft.data;
  const stats = data?.state?.stats;
  return (
    <article className="nft-card" ref={ref}>
      <Link to={`/nft/${address}`} className="nft-card-link">
        <Artwork address={address} alt={data ? nftTitle(data.meta) : ""} />
        <div className="nft-card-body">
          <div className="nft-card-meta">
            {data ? (
              <span className="nft-card-context">
                {data.collection ? data.collection.name : data.creator?.name || shortAddress(data.creator?.address)}
              </span>
            ) : (
              <Skeleton style={{ width: "50%" }} />
            )}
            <h3 className="nft-card-title">{data ? nftTitle(data.meta) : <Skeleton style={{ width: "75%" }} />}</h3>
          </div>
          <div className="nft-card-foot">
            {stats ? (
              <>
                <span className="nft-card-price">
                  {formatSats(stats.price)} <small>DINGO</small>
                </span>
                {stats.tradeCount > 0 && (
                  <span className="nft-card-trades" title={`${stats.tradeCount} trades`}>
                    <Icon name="swap" size={13} /> {stats.tradeCount}
                  </span>
                )}
              </>
            ) : nft.status === "ok" ? (
              <span className="muted small">Not listed</span>
            ) : (
              <Skeleton style={{ width: "40%" }} />
            )}
          </div>
        </div>
      </Link>
      {footer}
    </article>
  );
}

export function CollectionCard({ handle }) {
  const [ref, visible] = useVisible();
  const result = useAsync(visible ? `collection-card:${handle}` : null, async () => {
    const [collection, stats] = await Promise.all([loadCollection(handle), getCollectionStats(handle)]);
    const owner = collection ? await loadProfile(collection.owner) : null;
    return { collection, stats, owner };
  });
  const { collection, stats, owner } = result.data || {};
  if (result.status === "ok" && !collection) {
    return null;
  }
  return (
    <article className="collection-card" ref={ref}>
      <Link to={`/collection/${handle}`} className="collection-card-link">
        <div className="collection-card-cover">
          {collection ? <Artwork address={collection.thumbnail} alt="" /> : <Skeleton className="fill" />}
        </div>
        <div className="collection-card-body">
          <h3>{collection ? collection.name : <Skeleton style={{ width: "60%" }} />}</h3>
          <p className="collection-card-owner">
            {owner ? (
              <>
                <Avatar profile={owner} size={18} /> {owner.name || shortAddress(owner.address)}
              </>
            ) : (
              <Skeleton style={{ width: "40%" }} />
            )}
          </p>
          <dl className="collection-card-stats">
            <div>
              <dt>Items</dt>
              <dd>{stats ? formatWhole(stats.count) : "–"}</dd>
            </div>
            <div>
              <dt>Volume</dt>
              <dd>{stats ? formatCompact(stats.tradeVolume) : "–"}</dd>
            </div>
            <div>
              <dt>Trades</dt>
              <dd>{stats ? formatWhole(stats.tradeCount) : "–"}</dd>
            </div>
          </dl>
        </div>
      </Link>
    </article>
  );
}

export function ProfileCard({ address, rank }) {
  const [ref, visible] = useVisible();
  const result = useAsync(visible ? `profile-card:${address}` : null, async () => {
    const [profile, created, collections, historical] = await Promise.all([
      loadProfile(address),
      getProfileCreatedCount(address),
      getProfileCollectionCount(address),
      getProfileHistoricalCount(address),
    ]);
    return { profile, created, collections, collected: Math.max(0, historical - created) };
  });
  const data = result.data;
  return (
    <article className="profile-card" ref={ref}>
      <Link to={`/profile/${address}`} className="profile-card-link">
        {rank !== undefined && <span className="profile-card-rank">{rank}</span>}
        <Avatar profile={data?.profile || { address }} size={52} />
        <div className="profile-card-body">
          <h3>
            {data ? (
              data.profile.name || <span className="mono">{shortAddress(address)}</span>
            ) : (
              <Skeleton style={{ width: "60%" }} />
            )}
          </h3>
          <p className="profile-card-stats">
            {data ? (
              <>
                <span>
                  <strong>{data.created}</strong> created
                </span>
                <span>
                  <strong>{data.collections}</strong> collections
                </span>
                <span>
                  <strong>{data.collected}</strong> collected
                </span>
              </>
            ) : (
              <Skeleton style={{ width: "80%" }} />
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}

// Grid of cards with "load more" paging over a known list of keys.
export function CardGrid({ items, kind = "nft", pageSize = 24, empty, renderFooter, ranked }) {
  const [shown, setShown] = React.useState(pageSize);
  const [sentinel, nearEnd] = useVisible("600px");
  const more = items.length > shown;

  React.useEffect(() => setShown(pageSize), [items, pageSize]);
  // Infinite scroll, with the button as a fallback.
  React.useEffect(() => {
    if (nearEnd && more) {
      setShown((n) => n + pageSize);
    }
  }, [nearEnd, more, pageSize]);

  if (items.length === 0) {
    return empty || null;
  }
  return (
    <>
      <div className={`grid grid-${kind}`}>
        {items.slice(0, shown).map((key, i) =>
          kind === "nft" ? (
            <NftCard key={key} address={key} footer={renderFooter?.(key)} />
          ) : kind === "collection" ? (
            <CollectionCard key={key} handle={key} />
          ) : (
            <ProfileCard key={key} address={key} rank={ranked ? i + 1 : undefined} />
          )
        )}
      </div>
      {more && (
        <div className="load-more" ref={sentinel}>
          <button type="button" className="btn btn-secondary" onClick={() => setShown((n) => n + pageSize)}>
            Show more
          </button>
        </div>
      )}
    </>
  );
}

export function GridSkeleton({ kind = "nft", count = 8 }) {
  return (
    <div className={`grid grid-${kind}`} aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`card-skeleton card-skeleton-${kind}`}>
          <Skeleton className="fill" />
        </div>
      ))}
    </div>
  );
}
