import React from "react";
import { useSearchParams } from "react-router-dom";
import { NftCard, GridSkeleton } from "../components/cards";
import { Empty, ErrorState, PageHeader, Spinner } from "../components/ui";
import { NFT_PAGE_SIZE, queryNfts, queryNftsByNewest } from "../lib/api";
import { useDocumentTitle, useVisible } from "../lib/hooks";

const SORTS = [
  { value: "newest", label: "Newly listed" },
  { value: "sold", label: "Recently sold", key: "tradeHeight", direction: "DESC" },
  { value: "price-desc", label: "Price: high to low", key: "price", direction: "DESC" },
  { value: "price-asc", label: "Price: low to high", key: "price", direction: "ASC" },
  { value: "trades", label: "Most traded", key: "tradeCount", direction: "DESC" },
  { value: "volume", label: "Highest volume", key: "tradeVolume", direction: "DESC" },
];

// Fetches the next page after `loaded` addresses. Newest pages by id, the
// rest by offset.
const fetchPage = async (sort, loaded, lastId) => {
  if (sort.value === "newest") {
    const rows = await queryNftsByNewest(lastId);
    return { addresses: rows.map((r) => r.address), lastId: rows.at(-1)?.id ?? lastId, done: rows.length < NFT_PAGE_SIZE };
  }
  const addresses = await queryNfts({ key: sort.key, direction: sort.direction, offset: loaded });
  return { addresses, lastId: null, done: addresses.length < NFT_PAGE_SIZE };
};

export default function ExploreNfts() {
  useDocumentTitle("Explore NFTs");
  const [params, setParams] = useSearchParams();
  const sort = SORTS.find((s) => s.value === params.get("sort")) || SORTS[0];
  const [list, setList] = React.useState({ sort: null, addresses: [], lastId: null, done: false, error: null });
  const [loading, setLoading] = React.useState(false);
  const [sentinel, nearEnd] = useVisible("800px");

  const loadMore = React.useCallback(
    async (reset) => {
      setLoading(true);
      try {
        const base = reset ? { addresses: [], lastId: null } : list;
        const page = await fetchPage(sort, base.addresses.length, base.lastId);
        setList({
          sort: sort.value,
          // Pages can overlap when listings change between requests.
          addresses: [...new Set([...base.addresses, ...page.addresses])],
          lastId: page.lastId,
          done: page.done,
          error: null,
        });
      } catch (error) {
        setList((l) => ({ ...l, sort: sort.value, error }));
      } finally {
        setLoading(false);
      }
    },
    [list, sort]
  );

  React.useEffect(() => {
    if (list.sort !== sort.value && !loading) {
      loadMore(true);
    }
  }, [sort.value, list.sort, loading, loadMore]);

  React.useEffect(() => {
    if (nearEnd && list.sort === sort.value && !list.done && !loading && !list.error) {
      loadMore(false);
    }
  }, [nearEnd, list, sort.value, loading, loadMore]);

  const current = list.sort === sort.value;

  return (
    <div className="container page">
      <PageHeader eyebrow="Explore" title="NFTs" actions={
        <label className="select">
          <span className="sr-only">Sort by</span>
          <select
            value={sort.value}
            onChange={(e) => setParams(e.target.value === "newest" ? {} : { sort: e.target.value }, { replace: true })}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      } />

      {!current && <GridSkeleton count={12} />}
      {current && list.error && list.addresses.length === 0 && (
        <ErrorState error={list.error} onRetry={() => loadMore(true)} />
      )}
      {current && !list.error && list.addresses.length === 0 && list.done && <Empty title="No NFTs yet" />}
      {current && list.addresses.length > 0 && (
        <div className="grid grid-nft">
          {list.addresses.map((address) => (
            <NftCard key={address} address={address} />
          ))}
        </div>
      )}
      {current && !list.done && list.addresses.length > 0 && (
        <div className="load-more" ref={sentinel}>
          {loading ? (
            <Spinner />
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => loadMore(false)}>
              {list.error ? "Retry" : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
