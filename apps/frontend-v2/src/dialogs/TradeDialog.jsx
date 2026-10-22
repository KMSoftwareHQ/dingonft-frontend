import React from "react";
import Dialog from "../components/Dialog";
import Field from "../components/Field";
import { Button, Notice } from "../components/ui";
import { useToast } from "../components/Toasts";
import { EXPLORER_TX_URL } from "../lib/config";
import { invalidate } from "../lib/cache";
import { formatSats, formatWhole, satsToWhole, toSatoshi } from "../lib/money";
import { signTransaction } from "../lib/wallet";
import {
  getBuyTransaction,
  getRepriceTransaction,
  sendBuyTransaction,
  sendRepriceTransaction,
} from "../lib/api";

// Server-side limits (services/provider/transactionProcessing.js): every price
// is at least 1 DINGO; a resale is at most 10x the current price; a reprice can
// only lower the price.
const MODES = {
  buy: {
    title: "Buy this NFT",
    action: "Buy and list for resale",
    max: (current) => current * 10n,
    describe: (current) =>
      `On this platform every purchase relists the NFT. Choose the price you'll resell it at: 1 to ${formatWhole(
        current * 10n
      )} DINGO.`,
    label: "Your resale price",
    getTransaction: getBuyTransaction,
    sendTransaction: sendBuyTransaction,
    success: "Purchase submitted",
  },
  reprice: {
    title: "Lower the price",
    action: "Lower price",
    max: (current) => current,
    describe: (current) => `Set a new price between 1 and ${formatWhole(current)} DINGO. Prices can only go down.`,
    label: "New price",
    getTransaction: getRepriceTransaction,
    sendTransaction: sendRepriceTransaction,
    success: "Price change submitted",
  },
};

const friendly = (message) =>
  ({
    "Invalid transaction":
      "The transaction was rejected. Make sure your wallet has no pending transaction, and that you aren't buying your own NFT.",
    "Asset busy": "Another transaction for this NFT is confirming. Try again in a few minutes.",
    "Asset is not listed": "This NFT isn't listed.",
  })[message] || message;

export default function TradeDialog({ mode, open, onClose, address, title, priceSats, onDone }) {
  const config = MODES[mode];
  const current = BigInt(satsToWhole(priceSats));
  const [value, setValue] = React.useState("");
  const [step, setStep] = React.useState("form"); // form | preparing | signing | sending | done
  const [error, setError] = React.useState("");
  const [txid, setTxid] = React.useState(null);
  const toast = useToast();

  React.useEffect(() => {
    if (open) {
      setValue(mode === "buy" ? current.toString() : "");
      setStep("form");
      setError("");
      setTxid(null);
    }
  }, [open, mode, current]);

  const amount = value === "" ? null : BigInt(value);
  const max = config.max(current);
  const inputError =
    amount === null
      ? ""
      : amount < 1n
        ? "The minimum is 1 DINGO"
        : amount > max
          ? `The maximum is ${formatWhole(max)} DINGO`
          : "";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setStep("preparing");
      const { vins, vouts } = await config.getTransaction({ address, price: toSatoshi(value) });
      setStep("signing");
      const signed = await signTransaction(vins, vouts);
      setStep("sending");
      const result = await config.sendTransaction(signed);
      setTxid(result.txid);
      setStep("done");
      invalidate(`state:${address}`, "api:nft/query", "api:profile/", "api:collection/getStats");
      toast({ tone: "success", title: config.success, body: "It confirms in a few minutes." });
      onDone?.();
    } catch (err) {
      setStep("form");
      setError(friendly(err.message));
    }
  };

  const working = ["preparing", "signing", "sending"].includes(step);

  return (
    <Dialog open={open} onClose={working ? () => {} : onClose} title={config.title} size="sm">
      {step === "done" ? (
        <div className="trade-done">
          <Notice tone="success" title="Transaction submitted">
            It can take a few minutes to confirm. The NFT shows as busy until then.
          </Notice>
          {txid && (
            <a className="text-link mono small" href={`${EXPLORER_TX_URL}${txid}`} target="_blank" rel="noreferrer">
              View transaction {txid.slice(0, 10)}…
            </a>
          )}
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="trade-form">
          <div className="trade-summary">
            <span className="muted small">{title}</span>
            <span className="trade-price">
              {formatSats(priceSats)} <small>DINGO</small>
            </span>
            <span className="muted small">{mode === "buy" ? "Price, plus a small network fee" : "Current price"}</span>
          </div>
          <p className="small muted">{config.describe(current)}</p>
          <Field label={config.label} error={inputError}>
            <input
              className="input input-amount"
              inputMode="numeric"
              autoComplete="off"
              value={value}
              disabled={working}
              placeholder="0"
              onChange={(e) => /^\d{0,15}$/.test(e.target.value) && setValue(e.target.value.replace(/^0+(?=\d)/, ""))}
            />
          </Field>
          {error && <Notice tone="danger">{error}</Notice>}
          <Button type="submit" busy={working} disabled={amount === null || inputError !== ""} className="btn-block">
            {step === "preparing"
              ? "Preparing transaction…"
              : step === "signing"
                ? "Confirm in your wallet…"
                : step === "sending"
                  ? "Sending…"
                  : config.action}
          </Button>
        </form>
      )}
    </Dialog>
  );
}
