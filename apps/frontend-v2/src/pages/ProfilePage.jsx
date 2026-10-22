import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CardGrid, CollectionCard, GridSkeleton } from "../components/cards";
import Icon from "../components/Icon";
import { RouteTabs } from "../components/Tabs";
import { useToast } from "../components/Toasts";
import { useWallet } from "../components/Wallet";
import { Avatar, Button, CopyButton, Empty, ErrorState, Skeleton, Stat } from "../components/ui";
import CollectionDialog from "../dialogs/CollectionDialog";
import ProfileDialog from "../dialogs/ProfileDialog";
import {
  getProfileCreatedNfts,
  getProfileHistoricalNfts,
  getProfileOwnedNfts,
  getProfileStats,
  queryCollectionsByOwner,
  queryUnassignedNftsByOwner,
  setCollectionItem,
} from "../lib/api";
import { invalidate } from "../lib/cache";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { loadProfile, shortAddress } from "../lib/models";
import { formatSats } from "../lib/money";
import { signPayload } from "../lib/wallet";

// "Add to collection" control under each unassigned NFT (owner only).
function MoveToCollection({ address, collections, onMoved }) {
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  if (!collections?.length) {
    return null;
  }
  return (
    <label className="move-select">
      <Icon name="folder" size={15} />
      <select
        value=""
        disabled={busy}
        aria-label="Add to collection"
        onChange={async (e) => {
          const handle = e.target.value;
          setBusy(true);
          try {
            await setCollectionItem(await signPayload({ timestamp: Date.now(), address, handle }));
            invalidate("api:collection/", "items:", `nft:${address}`);
            toast({ tone: "success", title: "Added to collection" });
            onMoved();
          } catch (err) {
            toast({ tone: "danger", title: "Couldn't add to collection", body: err.message });
          } finally {
            setBusy(false);
          }
        }}
      >
        <option value="" disabled>
          {busy ? "Confirm in wallet…" : "Add to collection…"}
        </option>
        {collections.map((handle) => (
          <option key={handle} value={handle}>
            {handle}
          </option>
        ))}
      </select>
    </label>
  );
}

function Created({ address, mine, ensureWallet }) {
  const [creating, setCreating] = React.useState(false);
  const result = useAsync(`profile-created:${address}`, async () => {
    const [collections, unassigned] = await Promise.all([
      queryCollectionsByOwner(address),
      queryUnassignedNftsByOwner(address),
    ]);
    return { collections: [...collections].reverse(), unassigned: [...unassigned].reverse() };
  });

  if (result.status === "error") {
    return <ErrorState error={result.error} onRetry={result.reload} />;
  }
  const data = result.data;
  return (
    <>
      <section className="profile-section">
        <div className="section-head">
          <h2>Collections</h2>
          {mine !== false && (
            <Button variant="secondary" size="sm" icon="plus" onClick={() => ensureWallet() && setCreating(true)}>
              New collection
            </Button>
          )}
        </div>
        {!data ? (
          <GridSkeleton kind="collection" count={3} />
        ) : data.collections.length === 0 ? (
          <Empty icon="folder" title="No collections yet" />
        ) : (
          <div className="grid grid-collection">
            {data.collections.map((handle) => (
              <CollectionCard key={handle} handle={handle} />
            ))}
          </div>
        )}
      </section>

      {data && data.unassigned.length > 0 && (
        <section className="profile-section">
          <div className="section-head">
            <h2>Not in a collection</h2>
            <span className="muted small">{data.unassigned.length} NFTs</span>
          </div>
          <CardGrid
            items={data.unassigned}
            renderFooter={
              mine !== false
                ? (nft) => (
                    <MoveToCollection
                      address={nft}
                      collections={data.collections}
                      onMoved={result.reload}
                    />
                  )
                : undefined
            }
          />
        </section>
      )}

      <CollectionDialog open={creating} onClose={() => setCreating(false)} owner={address} onSaved={result.reload} />
    </>
  );
}

function Owned({ address }) {
  // Owned and previously owned, minus the profile's own creations.
  const result = useAsync(`profile-owned:${address}`, async () => {
    const [created, owned, historical] = await Promise.all([
      getProfileCreatedNfts(address),
      getProfileOwnedNfts(address),
      getProfileHistoricalNfts(address),
    ]);
    const createdSet = new Set(created);
    const ownedSet = new Set(owned);
    return {
      owned: owned.filter((a) => !createdSet.has(a)).reverse(),
      previous: historical.filter((a) => !createdSet.has(a) && !ownedSet.has(a)).reverse(),
    };
  });
  if (result.status === "loading") {
    return <GridSkeleton count={8} />;
  }
  if (result.status === "error") {
    return <ErrorState error={result.error} onRetry={result.reload} />;
  }
  return (
    <>
      <section className="profile-section">
        <div className="section-head">
          <h2>Collected</h2>
          <span className="muted small">{result.data.owned.length} NFTs</span>
        </div>
        <CardGrid items={result.data.owned} empty={<Empty icon="coins" title="Nothing collected yet" />} />
      </section>
      {result.data.previous.length > 0 && (
        <section className="profile-section">
          <div className="section-head">
            <h2>Previously owned</h2>
            <span className="muted small">{result.data.previous.length} NFTs</span>
          </div>
          <CardGrid items={result.data.previous} />
        </section>
      )}
    </>
  );
}

function Stats({ address }) {
  const result = useAsync(`profile-stats:${address}`, () => getProfileStats(address));
  if (result.status === "loading") {
    return <GridSkeleton kind="collection" count={3} />;
  }
  if (result.status === "error") {
    return <ErrorState error={result.error} onRetry={result.reload} />;
  }
  const s = result.data;
  if (!s || s.listCount === undefined) {
    return <Empty icon="trending" title="No activity yet" />;
  }
  const earnings = BigInt(s.royaltyVolume) + BigInt(s.sellVolume) - BigInt(s.buyVolume);
  return (
    <div className="stats-sections">
      <section className="panel">
        <h2>As a creator</h2>
        <dl className="stat-grid">
          <Stat label="NFTs created" value={s.listCount} />
          <Stat label="Times sold" value={s.listSoldCount} />
          <Stat label="Royalties earned" value={formatSats(s.royaltyVolume)} hint="DINGO" />
        </dl>
      </section>
      <section className="panel">
        <h2>As a trader</h2>
        <dl className="stat-grid">
          <Stat label="NFTs bought or sold" value={s.tradeCount} />
          <Stat label="Spent" value={formatSats(s.buyVolume)} hint="DINGO" />
          <Stat label="Sales" value={formatSats(s.sellVolume)} hint="DINGO" />
        </dl>
      </section>
      <section className="panel panel-accent">
        <h2>Overall</h2>
        <dl className="stat-grid">
          <Stat label="Net earnings (sales + royalties − purchases)" value={formatSats(earnings.toString())} hint="DINGO" />
        </dl>
      </section>
    </div>
  );
}

export default function ProfilePage() {
  const { address } = useParams();
  const location = useLocation();
  const { ensureWallet, isOwner } = useWallet();
  const [editing, setEditing] = React.useState(false);
  const profile = useAsync(`profile-page:${address}`, () => loadProfile(address));
  const data = profile.data;
  useDocumentTitle(data?.name || shortAddress(address));

  const tab = location.pathname.endsWith("/owned") ? "owned" : location.pathname.endsWith("/stats") ? "stats" : "created";
  const mine = isOwner(address);

  return (
    <div className="container page">
      <header className="profile-header">
        <Avatar profile={data || { address }} size={104} />
        <div className="profile-header-info">
          {mine && <span className="chip chip-accent">This is you</span>}
          <h1>{profile.status === "loading" ? <Skeleton style={{ width: "10ch" }} /> : data?.name || shortAddress(address)}</h1>
          <p className="profile-address">
            <span className="mono">{address}</span>
            <CopyButton value={address} label="Copy address" />
          </p>
        </div>
        {mine !== false && (
          <Button variant="secondary" icon="pen" onClick={() => ensureWallet() && setEditing(true)}>
            Edit profile
          </Button>
        )}
      </header>

      <RouteTabs
        label="Profile sections"
        tabs={[
          { to: `/profile/${address}`, label: "Created", replace: true },
          { to: `/profile/${address}/owned`, label: "Collected", replace: true },
          { to: `/profile/${address}/stats`, label: "Stats", replace: true },
        ]}
      />

      {tab === "created" && <Created address={address} mine={mine} ensureWallet={ensureWallet} />}
      {tab === "owned" && <Owned address={address} />}
      {tab === "stats" && <Stats address={address} />}

      {mine === true && tab === "created" && (
        <p className="small muted profile-cta">
          Ready to add something new? <Link className="text-link" to="/create">Create an NFT</Link>
        </p>
      )}

      {data && (
        <ProfileDialog open={editing} onClose={() => setEditing(false)} profile={data} onSaved={profile.reload} />
      )}
    </div>
  );
}
