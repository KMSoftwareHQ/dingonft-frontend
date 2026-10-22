import React from "react";
import { Link, useParams } from "react-router-dom";
import Dialog from "../components/Dialog";
import Icon from "../components/Icon";
import Rail from "../components/Rail";
import { NftCard } from "../components/cards";
import { useWallet } from "../components/Wallet";
import { Artwork, Button, CopyButton, ErrorState, Notice, PersonLink, Skeleton, Stat } from "../components/ui";
import TradeDialog from "../dialogs/TradeDialog";
import NotFound from "./NotFound";
import { EXPLORER_TX_URL } from "../lib/config";
import { getCollectionItems, getNftBusy, getNftContent } from "../lib/api";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { loadNft, nftTags, nftTitle } from "../lib/models";
import { formatSats, formatWhole } from "../lib/money";
import { previewUrl } from "../lib/storage";
import { signMessage } from "../lib/wallet";

// The original file: the current owner signs "<address>|<timestamp>" and gets a
// presigned link that's valid for 30 seconds.
function OriginalFile({ address, owner }) {
  const { ensureWallet, isOwner } = useWallet();
  const [state, setState] = React.useState({ status: "idle" });

  const unlock = async () => {
    if (!ensureWallet()) {
      return;
    }
    setState({ status: "signing" });
    try {
      const timestamp = Date.now();
      const signature = await signMessage(`${address}|${timestamp}`);
      const url = await getNftContent({ address, timestamp, signature });
      setState({ status: "ready", url });
    } catch (err) {
      setState({
        status: "error",
        message: err.message === "Wrong signature" ? "Only the current owner can download the original." : err.message,
      });
    }
  };

  const mine = isOwner(owner);
  return (
    <div className="panel original">
      <div className="panel-title">
        <Icon name="shield" size={18} />
        <h2>Original file</h2>
      </div>
      <p className="small muted">
        The full-resolution original is private. {mine === false ? "Only the owner can download it." : "The owner can unlock it by signing with their wallet."}
      </p>
      {state.status === "ready" ? (
        <a className="btn btn-secondary btn-block" href={state.url} target="_blank" rel="noreferrer">
          <Icon name="download" size={17} /> Open original
        </a>
      ) : (
        mine !== false && (
          <Button variant="secondary" icon="lock" className="btn-block" busy={state.status === "signing"} onClick={unlock}>
            {state.status === "signing" ? "Confirm in your wallet…" : "Verify ownership to download"}
          </Button>
        )
      )}
      {state.status === "ready" && <p className="small muted">The link expires 30 seconds after unlocking.</p>}
      {state.status === "error" && <Notice tone="danger">{state.message}</Notice>}
    </div>
  );
}

function MoreFromCollection({ collection, address }) {
  const items = useAsync(`items:${collection.handle}`, () => getCollectionItems(collection.handle));
  const others = (items.data || []).filter((a) => a !== address).reverse().slice(0, 16);
  if (items.status === "ok" && others.length === 0) {
    return null;
  }
  return (
    <Rail title={`More from ${collection.name}`} to={`/collection/${collection.handle}`} loading={items.status === "loading"}>
      {others.map((a) => (
        <div key={a} className="rail-item">
          <NftCard address={a} />
        </div>
      ))}
    </Rail>
  );
}

export default function NftPage() {
  const { address } = useParams();
  const { ensureWallet, isOwner } = useWallet();
  const nft = useAsync(`nft-page:${address}`, () => loadNft(address));
  const busy = useAsync(`busy:${address}`, () => getNftBusy(address));
  const [trade, setTrade] = React.useState(null);
  const [zoom, setZoom] = React.useState(false);
  const data = nft.data;
  useDocumentTitle(data ? nftTitle(data.meta) : "NFT");

  if (nft.status === "error") {
    return (
      <div className="container page">
        <ErrorState error={nft.error} onRetry={nft.reload} />
      </div>
    );
  }
  if (nft.status === "ok" && !data.meta) {
    return <NotFound title="NFT not found">No NFT exists at {address}.</NotFound>;
  }

  const stats = data?.state?.stats;
  const owner = data?.state?.owner;
  const mine = owner ? isOwner(owner) : null;
  const isBusy = busy.status === "ok" && busy.data !== null;
  const tags = nftTags(data?.meta);

  const openTrade = (mode) => ensureWallet() && setTrade(mode);

  return (
    <div className="container page nft-page">
      <div className="nft-layout">
        <div className="nft-media">
          <button type="button" className="nft-media-frame" onClick={() => setZoom(true)} aria-label="View full size">
            <Artwork address={address} alt={data ? nftTitle(data.meta) : ""} eager />
            <span className="nft-media-zoom">
              <Icon name="expand" size={16} />
            </span>
          </button>
        </div>

        <div className="nft-info">
          {data ? (
            <>
              {data.collection && (
                <Link className="chip" to={`/collection/${data.collection.handle}`}>
                  <Icon name="folder" size={14} /> {data.collection.name}
                </Link>
              )}
              <h1 className="nft-title">{nftTitle(data.meta)}</h1>
              <div className="nft-people">
                <PersonLink profile={data.creator} label="Created by" size={36} />
                {data.owner && data.owner.address !== data.creator?.address && (
                  <PersonLink profile={data.owner} label="Owned by" size={36} />
                )}
              </div>
              {data.meta.description && <p className="nft-description">{data.meta.description}</p>}
              {tags.length > 0 && (
                <ul className="tags">
                  {tags.map((tag) => (
                    <li key={tag}>
                      <Link to={`/search?query=${encodeURIComponent(tag)}&tab=nfts`}>#{tag}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <Skeleton style={{ width: "30%", height: 24 }} />
              <Skeleton style={{ width: "80%", height: 44 }} />
              <Skeleton style={{ width: "50%", height: 36 }} />
            </>
          )}

          <div className="panel buy-panel">
            <span className="muted small">{stats ? "Current price" : "Price"}</span>
            {stats ? (
              <span className="buy-price">
                {formatSats(stats.price)} <small>DINGO</small>
              </span>
            ) : (
              <Skeleton style={{ width: "50%", height: 40 }} />
            )}
            {isBusy && (
              <Notice tone="info" icon="clock" title="A transaction is confirming">
                <a className="text-link" href={`${EXPLORER_TX_URL}${busy.data.txid}`} target="_blank" rel="noreferrer">
                  This NFT
                </a>{" "}
                can be traded again once it confirms, usually within a few minutes.
              </Notice>
            )}
            <div className="buy-actions">
              {mine !== true && (
                <Button size="lg" icon="coins" className="btn-block" disabled={!stats || isBusy || busy.status !== "ok"} onClick={() => openTrade("buy")}>
                  Buy now
                </Button>
              )}
              {mine === true && (
                <Button size="lg" variant="secondary" icon="tag" className="btn-block" disabled={!stats || isBusy} onClick={() => openTrade("reprice")}>
                  Lower your price
                </Button>
              )}
            </div>
            {mine === null && stats && !isBusy && (
              <button type="button" className="text-link small" onClick={() => openTrade("reprice")}>
                Own this NFT? Lower its price
              </button>
            )}
          </div>

          <div className="panel">
            <dl className="stat-grid">
              <Stat label="Trade volume" value={stats ? `${formatSats(stats.tradeVolume)}` : "–"} hint="DINGO" />
              <Stat label="Trades" value={stats ? formatWhole(stats.tradeCount) : "–"} />
              <Stat label="Listed at block" value={stats ? formatWhole(stats.listHeight) : "–"} />
              <Stat label="Last sale block" value={stats?.tradeHeight ? formatWhole(stats.tradeHeight) : "–"} />
            </dl>
            <div className="nft-address">
              <span className="muted small">NFT address</span>
              <span className="mono small">{address}</span>
              <CopyButton value={address} label="Copy NFT address" />
            </div>
          </div>

          {owner && <OriginalFile address={address} owner={owner} />}
        </div>
      </div>

      {data?.collection && <MoreFromCollection collection={data.collection} address={address} />}

      {stats && (
        <TradeDialog
          mode={trade || "buy"}
          open={trade !== null}
          onClose={() => setTrade(null)}
          address={address}
          title={nftTitle(data.meta)}
          priceSats={stats.price}
          onDone={busy.reload}
        />
      )}

      <Dialog open={zoom} onClose={() => setZoom(false)} title={data ? nftTitle(data.meta) : ""} size="full">
        <img className="zoom-image" src={previewUrl(address)} alt="" />
      </Dialog>
    </div>
  );
}
