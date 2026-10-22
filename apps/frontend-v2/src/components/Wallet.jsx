import React from "react";
import Dialog from "./Dialog";
import Icon from "./Icon";
import { ButtonLink } from "./ui";
import { WALLET_URL } from "../lib/config";
import { getActiveAddress, hasWallet } from "../lib/wallet";

const WalletContext = React.createContext(null);

export const useWallet = () => React.useContext(WalletContext);

export function WalletProvider({ children }) {
  // The extension injects window.dingo at document start, but give it a beat.
  const [available, setAvailable] = React.useState(hasWallet);
  const [address, setAddress] = React.useState(null);
  const [promptOpen, setPromptOpen] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setAvailable(hasWallet());
    setAddress(await getActiveAddress());
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(refresh, 300);
    // The active account can change in the extension; re-check on focus.
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  // Returns true when a wallet is present; otherwise explains how to get one.
  const ensureWallet = React.useCallback(() => {
    if (hasWallet()) {
      return true;
    }
    setPromptOpen(true);
    return false;
  }, []);

  // isOwner(x): true for the connected address, null when we can't tell.
  const isOwner = React.useCallback(
    (owner) => (address === null ? null : address === owner),
    [address]
  );

  const value = React.useMemo(
    () => ({ available, address, refresh, ensureWallet, isOwner, openPrompt: () => setPromptOpen(true) }),
    [available, address, refresh, ensureWallet, isOwner]
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
      <Dialog open={promptOpen} onClose={() => setPromptOpen(false)} title="Get the Dingocoin wallet" size="sm">
        <div className="wallet-prompt">
          <span className="wallet-prompt-icon">
            <Icon name="wallet" size={26} />
          </span>
          <p>
            Creating, buying, and editing use the Dingocoin browser wallet. It takes about a minute to set up and
            is available for Chrome and Firefox.
          </p>
          <p className="muted small">
            It's non-custodial: back up your private key, because nobody can recover it for you.
          </p>
          <ButtonLink href={WALLET_URL} icon="external">
            Get the wallet
          </ButtonLink>
        </div>
      </Dialog>
    </WalletContext.Provider>
  );
}
