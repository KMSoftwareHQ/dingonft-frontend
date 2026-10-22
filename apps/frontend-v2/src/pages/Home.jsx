import { Link } from "react-router-dom";
import Rail from "../components/Rail";
import { CollectionCard, NftCard } from "../components/cards";
import Icon from "../components/Icon";
import { Artwork, ButtonLink, Skeleton } from "../components/ui";
import { getPlatformStats, queryCollectionsTrending, queryNfts } from "../lib/api";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { formatCompact } from "../lib/money";
import { WALLET_URL } from "../lib/config";

const RAIL_SIZE = 20;

function RailItems({ result, render }) {
  if (result.status !== "ok") {
    return Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="rail-item">
        <div className="card-skeleton card-skeleton-nft">
          <Skeleton className="fill" />
        </div>
      </div>
    ));
  }
  return result.data.map((key) => (
    <div key={key} className="rail-item">
      {render(key)}
    </div>
  ));
}

function HeroMosaic({ addresses }) {
  const tiles = addresses?.slice(0, 5) || [];
  return (
    <div className="hero-mosaic" aria-hidden={tiles.length === 0}>
      {Array.from({ length: 5 }, (_, i) =>
        tiles[i] ? (
          <Link key={tiles[i]} to={`/nft/${tiles[i]}`} className={`hero-tile hero-tile-${i}`} tabIndex={-1}>
            <Artwork address={tiles[i]} eager />
          </Link>
        ) : (
          <div key={i} className={`hero-tile hero-tile-${i}`}>
            <Skeleton className="fill" />
          </div>
        )
      )}
    </div>
  );
}

export default function Home() {
  useDocumentTitle(null);
  const stats = useAsync("home:stats", getPlatformStats);
  const trending = useAsync("home:trending", () => queryCollectionsTrending(RAIL_SIZE));
  const newest = useAsync("home:newest", () =>
    queryNfts({ key: "listHeight", direction: "DESC", limit: RAIL_SIZE })
  );
  const sold = useAsync("home:sold", () => queryNfts({ key: "tradeHeight", direction: "DESC", limit: RAIL_SIZE }));

  const totalVolume = stats.data?.totalVolume;

  return (
    <>
      <section className="hero">
        <div className="container hero-row">
          <div className="hero-copy">
            <p className="eyebrow">The Dingocoin NFT platform</p>
            <h1>
              Art, minted and traded <em>on-chain</em>.
            </h1>
            <p className="hero-lede">
              Every NFT is locked to its original file, royalties pay out the moment a piece sells, and fees cost a
              fraction of a cent.
            </p>
            <div className="hero-actions">
              <ButtonLink to="/nfts" size="lg" icon="grid">
                Explore NFTs
              </ButtonLink>
              <ButtonLink to="/create" size="lg" variant="secondary" icon="plus">
                Create
              </ButtonLink>
            </div>
            <dl className="hero-stats">
              <div>
                <dt>Traded all-time</dt>
                <dd>
                  {stats.status !== "ok" ? (
                    <Skeleton style={{ width: "5ch" }} />
                  ) : totalVolume ? (
                    <>
                      {formatCompact(totalVolume)} <small>DINGO</small>
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt>Network fees</dt>
                <dd>
                  &lt;$0.001 <small>per trade</small>
                </dd>
              </div>
              <div>
                <dt>Creator royalties</dt>
                <dd>
                  2.5–10<small>%</small>
                </dd>
              </div>
            </dl>
          </div>
          <HeroMosaic addresses={sold.data} />
        </div>
      </section>

      <div className="container home-rails">
        <Rail title="Trending collections" icon="trending" to="/collections" loading={trending.status === "loading"}>
          <RailItems result={trending} render={(handle) => <CollectionCard handle={handle} />} />
        </Rail>
        <Rail title="Newly listed" icon="sparkles" to="/nfts?sort=newest" loading={newest.status === "loading"}>
          <RailItems result={newest} render={(address) => <NftCard address={address} />} />
        </Rail>
        <Rail title="Recently sold" icon="coins" to="/nfts?sort=sold" loading={sold.status === "loading"}>
          <RailItems result={sold} render={(address) => <NftCard address={address} />} />
        </Rail>
      </div>

      <section className="container how">
        <h2>How it works</h2>
        <ol className="how-steps">
          <li>
            <span className="how-icon">
              <Icon name="wallet" size={22} />
            </span>
            <h3>Get the wallet</h3>
            <p>
              Install the Dingocoin browser wallet. It's non-custodial, so back up your key.{" "}
              <a href={WALLET_URL} target="_blank" rel="noreferrer" className="text-link">
                Get it
              </a>
            </p>
          </li>
          <li>
            <span className="how-icon">
              <Icon name="upload" size={22} />
            </span>
            <h3>Create an NFT</h3>
            <p>
              Upload your original work and a cover image, set a price and your royalty.{" "}
              <Link to="/create" className="text-link">
                Start creating
              </Link>
            </p>
          </li>
          <li>
            <span className="how-icon">
              <Icon name="coins" size={22} />
            </span>
            <h3>Earn on every sale</h3>
            <p>Sales and royalties land in your wallet as soon as a trade confirms, for every resale after.</p>
          </li>
          <li>
            <span className="how-icon">
              <Icon name="lock" size={22} />
            </span>
            <h3>Provably unique</h3>
            <p>An NFT is bound to its file's hash. The same content can never be minted twice.</p>
          </li>
        </ol>
      </section>
    </>
  );
}
