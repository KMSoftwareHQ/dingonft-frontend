import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CardGrid, GridSkeleton } from "../components/cards";
import Icon from "../components/Icon";
import { Segmented } from "../components/Tabs";
import { Empty, ErrorState, PageHeader } from "../components/ui";
import { searchCollections, searchNfts, searchProfiles } from "../lib/api";
import { useAsync, useDocumentTitle } from "../lib/hooks";

const TABS = [
  { value: "nfts", label: "NFTs", kind: "nft" },
  { value: "collections", label: "Collections", kind: "collection" },
  { value: "profiles", label: "Profiles", kind: "profile" },
];

export default function Search() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const query = (params.get("query") || "").trim();
  const [draft, setDraft] = React.useState(query);
  useDocumentTitle(query ? `“${query}”` : "Search");

  React.useEffect(() => setDraft(query), [query]);

  // All three in parallel, so the tab counts are known up front.
  const results = useAsync(query ? `search:${query}` : null, async () => {
    const [nfts, collections, profiles] = await Promise.all([
      searchNfts(query),
      searchCollections(query),
      searchProfiles(query),
    ]);
    return { nfts, collections, profiles };
  });

  const counts = results.data;
  const requested = TABS.find((t) => t.value === params.get("tab"));
  // Without an explicit tab, open the first one that has matches.
  const tab = requested || (counts && TABS.find((t) => counts[t.value].length > 0)) || TABS[0];

  return (
    <div className="container page">
      <PageHeader eyebrow="Search" title={query ? <>Results for “{query}”</> : "Search"} />
      <form
        className="search search-large"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = draft.trim();
          if (q) {
            navigate(`/search?query=${encodeURIComponent(q)}`);
          }
        }}
      >
        <Icon name="search" size={20} />
        <input
          type="search"
          value={draft}
          maxLength={50}
          autoFocus={!query}
          placeholder="Search NFTs, collections, creators"
          aria-label="Search"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}>
          Search
        </button>
      </form>

      {!query && (
        <Empty icon="search" title="Find NFTs, collections, and creators">
          Search by name, description, tag, or address.
        </Empty>
      )}

      {query && (
        <>
          <Segmented
            label="Result type"
            value={tab.value}
            onChange={(value) => setParams({ query, tab: value }, { replace: true })}
            options={TABS.map((t) => ({
              value: t.value,
              label: (
                <>
                  {t.label}
                  {counts && <span className="tab-count">{counts[t.value].length}</span>}
                </>
              ),
            }))}
          />
          {results.status === "loading" && <GridSkeleton kind={tab.kind} count={8} />}
          {results.status === "error" && <ErrorState error={results.error} onRetry={results.reload} />}
          {results.status === "ok" && (
            <CardGrid
              items={counts[tab.value]}
              kind={tab.kind}
              empty={
                <Empty icon="search" title={`No ${tab.label.toLowerCase()} match “${query}”`}>
                  Try a shorter or different term.
                </Empty>
              }
            />
          )}
        </>
      )}
    </div>
  );
}
