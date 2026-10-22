import React from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Icon from "./Icon";
import { Avatar } from "./ui";
import { useWallet } from "./Wallet";
import { DINGOCOIN_URL, REPORT_URL } from "../lib/config";
import { useAsync } from "../lib/hooks";
import { loadProfile, shortAddress } from "../lib/models";
import logo from "../dingocoin.png";

const THEMES = ["system", "light", "dark"];

const useTheme = () => {
  const [theme, setTheme] = React.useState(() => document.documentElement.dataset.theme || "system");
  React.useEffect(() => {
    if (theme === "system") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = theme;
    }
    try {
      localStorage.setItem("dingonft-theme", theme);
    } catch {
      // Storage blocked; the choice lasts for this page only.
    }
  }, [theme]);
  return [theme, () => setTheme((t) => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length])];
};

function SearchBox({ onDone }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const [query, setQuery] = React.useState(location.pathname === "/search" ? params.get("query") || "" : "");
  return (
    <form
      className="search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = query.trim();
        if (q) {
          navigate(`/search?query=${encodeURIComponent(q)}`);
          onDone?.();
        }
      }}
    >
      <Icon name="search" size={17} />
      <input
        type="search"
        value={query}
        maxLength={50}
        placeholder="Search NFTs, collections, creators"
        aria-label="Search"
        onChange={(e) => setQuery(e.target.value)}
      />
      <kbd className="search-kbd">/</kbd>
    </form>
  );
}

function WalletChip() {
  const { available, address, openPrompt } = useWallet();
  const profile = useAsync(address ? `profile:${address}` : null, () => loadProfile(address));
  if (address) {
    return (
      <Link className="wallet-chip" to={`/profile/${address}`} title="Your profile">
        <Avatar profile={profile.data || { address }} size={26} />
        <span>{profile.data?.name || shortAddress(address)}</span>
      </Link>
    );
  }
  if (available) {
    return (
      <span className="wallet-chip wallet-chip-idle" title="Unlock the wallet extension to see your profile here">
        <Icon name="wallet" size={16} /> Wallet locked
      </span>
    );
  }
  return (
    <button type="button" className="wallet-chip wallet-chip-idle" onClick={openPrompt}>
      <Icon name="wallet" size={16} /> Get wallet
    </button>
  );
}

const NAV = [
  { to: "/nfts", label: "NFTs" },
  { to: "/collections", label: "Collections" },
  { to: "/profiles", label: "Creators" },
  { to: "/create", label: "Create" },
];

export default function Layout() {
  const [theme, cycleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // "/" focuses search, like most galleries.
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        document.querySelector(".site-header .search input")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={`site-header ${menuOpen ? "menu-open" : ""}`}>
        <div className="container header-row">
          <Link to="/" className="brand" aria-label="Dingocoin NFT home">
            <img src={logo} alt="" width="32" height="32" />
            <span className="brand-name">
              Dingocoin <span>NFT</span>
            </span>
          </Link>
          <SearchBox onDone={() => setMenuOpen(false)} />
          <nav className="main-nav" aria-label="Main">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={false}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={cycleTheme}
              title={`Theme: ${theme}`}
              aria-label={`Theme: ${theme}. Change theme`}
            >
              <Icon name={theme === "dark" ? "moon" : theme === "light" ? "sun" : "monitor"} />
            </button>
            <WalletChip />
            <button
              type="button"
              className="icon-btn menu-toggle"
              aria-expanded={menuOpen}
              aria-label="Menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Icon name={menuOpen ? "x" : "menu"} />
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container footer-row">
          <div className="footer-brand">
            <img src={logo} alt="" width="28" height="28" />
            <div>
              <strong>Dingocoin NFT</strong>
              <p>Create, collect, and trade art on the Dingocoin blockchain.</p>
            </div>
          </div>
          <nav className="footer-links" aria-label="Footer">
            <Link to="/nfts">Explore</Link>
            <Link to="/create">Create</Link>
            <a href={DINGOCOIN_URL} target="_blank" rel="noreferrer">
              Dingocoin.com
            </a>
            <a href={REPORT_URL} target="_blank" rel="noreferrer">
              Report content
            </a>
            <a href="/">Classic site</a>
          </nav>
          <p className="footer-copy">© The Dingocoin Project 2021–{new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
