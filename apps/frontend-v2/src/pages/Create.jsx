import React from "react";
import DropZone from "../components/DropZone";
import Field, { counterText } from "../components/Field";
import Icon from "../components/Icon";
import { useWallet } from "../components/Wallet";
import { Button, ButtonLink, Notice, PageHeader } from "../components/ui";
import { getListTransaction, sendListTransaction } from "../lib/api";
import { invalidate } from "../lib/cache";
import { WALLET_URL } from "../lib/config";
import { sha256Hex } from "../lib/crypto";
import { toBase64, validateContent, validateCover } from "../lib/files";
import { useDocumentTitle } from "../lib/hooks";
import { formatWhole, toSatoshi } from "../lib/money";
import { signTransaction } from "../lib/wallet";

// The slider maps 0-100 onto the protocol's 25-100 per-mille royalty (2.5%-10%).
const royaltyPerMille = (slider) => 25 + Math.floor((slider * 75) / 100);
const royaltyPercent = (slider) => (royaltyPerMille(slider) / 10).toFixed(1);

const friendly = (message) =>
  ({
    "Content already registered": "This exact file is already an NFT. Each file can only be minted once.",
    "Content does not match transaction": "The file changed after signing. Start again.",
    "Invalid transaction": "The transaction was rejected. Make sure your wallet has no pending transaction.",
  })[message] || message;

const STEPS = { preparing: "Preparing", signing: "Confirm in your wallet", uploading: "Uploading", done: "Done" };

export default function Create() {
  useDocumentTitle("Create");
  const { ensureWallet } = useWallet();
  const [content, setContent] = React.useState(null);
  const [cover, setCover] = React.useState(null);
  const [coverUrl, setCoverUrl] = React.useState(null);
  const [coverError, setCoverError] = React.useState("");
  const [form, setForm] = React.useState({ name: "", description: "", tags: "", price: "1000", royalty: 0 });
  const [step, setStep] = React.useState(null);
  const [progress, setProgress] = React.useState(null);
  const [error, setError] = React.useState("");
  const [created, setCreated] = React.useState(null);
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (!cover) {
      setCoverUrl(null);
      setCoverError("");
      return undefined;
    }
    const url = URL.createObjectURL(cover);
    setCoverUrl(url);
    let live = true;
    validateCover(cover).then((message) => live && setCoverError(message));
    return () => {
      live = false;
      URL.revokeObjectURL(url);
    };
  }, [cover]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const contentError = content || touched ? validateContent(content) : "";
  const errors = {
    name: form.name.length > 40 ? "40 characters at most" : "",
    description: form.description.length > 500 ? "500 characters at most" : "",
    tags: form.tags.length > 100 ? "100 characters at most" : "",
    price: form.price === "" || BigInt(form.price || 0) < 1n ? "The minimum is 1 DINGO" : "",
  };
  const valid =
    content && !validateContent(content) && cover && coverError === "" && Object.values(errors).every((e) => e === "");
  const working = step !== null && step !== "done";

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || !ensureWallet()) {
      return;
    }
    setError("");
    try {
      setStep("preparing");
      const { vouts } = await getListTransaction({
        contentHash: await sha256Hex(content),
        price: toSatoshi(form.price),
        royalty: royaltyPerMille(form.royalty),
      });
      setStep("signing");
      const transaction = await signTransaction([], vouts);
      setStep("uploading");
      const result = await sendListTransaction(
        {
          content: await toBase64(content),
          preview: await toBase64(cover),
          name: form.name,
          description: form.description,
          tags: form.tags,
          transaction,
        },
        setProgress
      );
      invalidate("api:nft/", "api:profile/", "api:collection/queryUnassigned");
      setCreated(result.address);
      setStep("done");
    } catch (err) {
      setStep(null);
      setProgress(null);
      setError(friendly(err.message));
    }
  };

  if (step === "done") {
    return (
      <div className="container page create-done">
        <span className="create-done-icon">
          <Icon name="check" size={30} />
        </span>
        <h1>Your NFT is on its way</h1>
        <p className="muted">
          The listing transaction was sent. The NFT appears everywhere once it confirms, usually within a few minutes.
        </p>
        <p className="mono small">{created}</p>
        <div className="hero-actions">
          <ButtonLink to={`/nft/${created}`} icon="arrowRight">
            View NFT
          </ButtonLink>
          <Button
            variant="secondary"
            onClick={() => {
              setContent(null);
              setCover(null);
              setForm({ name: "", description: "", tags: "", price: "1000", royalty: 0 });
              setStep(null);
              setTouched(false);
            }}
          >
            Create another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <PageHeader eyebrow="Create" title="Mint a new NFT">
        Your NFT is bound to the original file's fingerprint, so the same file can never be minted again.
      </PageHeader>

      <form className="create-layout" onSubmit={submit} noValidate>
        <div className="create-form">
          <section className="panel form">
            <h2>Files</h2>
            <Field
              label="Original file"
              error={contentError}
              hint="Any file up to 10 MB. Only the current owner can download it."
            >
              <DropZone file={content} onFile={setContent} title="Drop the original here" hint="Image, video, audio, anything — max 10 MB" invalid={!!contentError} />
            </Field>
            <Field label="Cover image" error={cover ? coverError : touched ? "Choose a cover image" : ""} hint="The public preview: a square PNG or WEBP, max 1 MB.">
              <DropZone
                file={cover}
                onFile={setCover}
                accept="image/png,image/webp"
                title="Drop a square cover"
                hint="PNG or WEBP, square, max 1 MB"
                preview={coverError === "" ? coverUrl : null}
                invalid={!!coverError}
              />
            </Field>
          </section>

          <section className="panel form">
            <h2>Details</h2>
            <p className="small muted">These can't be changed after the NFT is created.</p>
            <Field label="Name" optional error={errors.name} counter={counterText(form.name, 40)}>
              <input className="input" value={form.name} onChange={set("name")} />
            </Field>
            <Field label="Description" optional error={errors.description} counter={counterText(form.description, 500)}>
              <textarea className="input" rows={4} value={form.description} onChange={set("description")} />
            </Field>
            <Field label="Tags" optional error={errors.tags} hint="Separate tags with spaces." counter={counterText(form.tags, 100)}>
              <input className="input" value={form.tags} placeholder="art pixel dingo" onChange={set("tags")} />
            </Field>
          </section>

          <section className="panel form">
            <h2>Sale</h2>
            <Field label="Listing price" error={errors.price} hint="What the first buyer pays, in whole DINGO.">
              <div className="input-affix">
                <input
                  className="input input-amount"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => /^\d{0,15}$/.test(e.target.value) && setForm((f) => ({ ...f, price: e.target.value.replace(/^0+(?=\d)/, "") }))}
                />
                <span className="affix">DINGO</span>
              </div>
            </Field>
            <Field label={`Creator royalty: ${royaltyPercent(form.royalty)}%`} hint="Paid to you on every future sale of this NFT.">
              <input className="range" type="range" min="0" max="100" value={form.royalty} onChange={set("royalty")} />
            </Field>
          </section>
        </div>

        <aside className="create-aside">
          <div className="create-preview">
            <span className="eyebrow">Preview</span>
            <article className="nft-card nft-card-static">
              <div className={`artwork ${coverUrl && !coverError ? "artwork-ok" : "artwork-error"}`}>
                {coverUrl && !coverError ? <img src={coverUrl} alt="" /> : <Icon name="image" size={28} />}
              </div>
              <div className="nft-card-body">
                <div className="nft-card-meta">
                  <span className="nft-card-context">Your new NFT</span>
                  <h3 className="nft-card-title">{form.name || "Untitled"}</h3>
                </div>
                <div className="nft-card-foot">
                  <span className="nft-card-price">
                    {form.price ? formatWhole(form.price) : "–"} <small>DINGO</small>
                  </span>
                  <span className="muted small">{royaltyPercent(form.royalty)}% royalty</span>
                </div>
              </div>
            </article>
          </div>

          {working && (
            <div className="panel create-progress" role="status">
              <ol className="steps">
                {["preparing", "signing", "uploading"].map((s) => (
                  <li key={s} className={s === step ? "current" : Object.keys(STEPS).indexOf(s) < Object.keys(STEPS).indexOf(step) ? "complete" : ""}>
                    {STEPS[s]}
                  </li>
                ))}
              </ol>
              {step === "uploading" && (
                <div className="progress" aria-label="Upload progress">
                  <span style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
                </div>
              )}
              <p className="small muted">Keep this page open until it finishes.</p>
            </div>
          )}

          {error && (
            <Notice tone="danger" title="Couldn't create the NFT">
              {error}
            </Notice>
          )}

          <Button type="submit" size="lg" className="btn-block" icon="sparkles" busy={working} disabled={touched && !valid}>
            {working ? STEPS[step] + "…" : "Create NFT"}
          </Button>
          <p className="small muted center">
            Creating sends a listing transaction from your{" "}
            <a className="text-link" href={WALLET_URL} target="_blank" rel="noreferrer">
              Dingocoin wallet
            </a>
            . Network fees are under $0.001.
          </p>
        </aside>
      </form>
    </div>
  );
}
