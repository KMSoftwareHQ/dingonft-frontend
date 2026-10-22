import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import Layout from "./components/Layout";
import { ToastProvider } from "./components/Toasts";
import { WalletProvider } from "./components/Wallet";
import { Spinner } from "./components/ui";
import { BASE_PATH } from "./lib/config";
import Home from "./pages/Home";

const ExploreNfts = React.lazy(() => import("./pages/ExploreNfts"));
const ExploreCollections = React.lazy(() => import("./pages/ExploreCollections"));
const ExploreProfiles = React.lazy(() => import("./pages/ExploreProfiles"));
const Search = React.lazy(() => import("./pages/Search"));
const NftPage = React.lazy(() => import("./pages/NftPage"));
const CollectionPage = React.lazy(() => import("./pages/CollectionPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const Create = React.lazy(() => import("./pages/Create"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

// The original site's per-type search pages fold into /search.
function SearchRedirect({ tab }) {
  const [params] = useSearchParams();
  const query = params.get("query");
  return <Navigate replace to={query ? `/search?query=${encodeURIComponent(query)}&tab=${tab}` : "/search"} />;
}

function ProfileRoute() {
  const { address } = useParams();
  return <ProfilePage key={address} />;
}

export default function App() {
  return (
    <BrowserRouter basename={BASE_PATH || "/"}>
      <WalletProvider>
        <ToastProvider>
          <React.Suspense
            fallback={
              <div className="page-loading">
                <Spinner size={28} />
              </div>
            }
          >
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="nfts" element={<ExploreNfts />} />
                <Route path="nfts/search" element={<SearchRedirect tab="nfts" />} />
                <Route path="collections" element={<ExploreCollections />} />
                <Route path="collections/hot" element={<Navigate replace to="/collections" />} />
                <Route path="collections/top" element={<ExploreCollections />} />
                <Route path="collections/search" element={<SearchRedirect tab="collections" />} />
                <Route path="profiles" element={<ExploreProfiles />} />
                <Route path="profiles/earnings" element={<ExploreProfiles />} />
                <Route path="profiles/search" element={<SearchRedirect tab="profiles" />} />
                <Route path="search" element={<Search />} />
                <Route path="nft/:address" element={<NftPage />} />
                <Route path="collection/:handle" element={<CollectionPage />} />
                <Route path="profile/:address/*" element={<ProfileRoute />} />
                <Route path="create" element={<Create />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </React.Suspense>
        </ToastProvider>
      </WalletProvider>
    </BrowserRouter>
  );
}
