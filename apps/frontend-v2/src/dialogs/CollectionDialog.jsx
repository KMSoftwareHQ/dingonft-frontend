import React from "react";
import { useNavigate } from "react-router-dom";
import Dialog from "../components/Dialog";
import Field, { counterText } from "../components/Field";
import ThumbnailPicker from "../components/ThumbnailPicker";
import { Button, Notice } from "../components/ui";
import { useToast } from "../components/Toasts";
import { createCollection, getProfileCreatedNfts, updateCollection } from "../lib/api";
import { invalidate } from "../lib/cache";
import { useAsync } from "../lib/hooks";
import { signPayload } from "../lib/wallet";

const friendly = (message) =>
  ({
    "Wrong signature": "The wallet's active account doesn't own this collection.",
    "Request expired": "The signature took too long. Try again.",
    "Bad handle format": "Handles use lowercase letters and numbers only.",
    "Wrong thumbnail creator": "The thumbnail must be one of your own creations.",
  })[message] || message;

// Create (no `collection`) or edit an existing collection.
export default function CollectionDialog({ open, onClose, owner, collection, onSaved }) {
  const editing = Boolean(collection);
  const [form, setForm] = React.useState({ name: "", handle: "", description: "", thumbnail: null });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const toast = useToast();
  const navigate = useNavigate();
  const creator = collection?.owner || owner;
  const created = useAsync(open ? `created:${creator}` : null, () => getProfileCreatedNfts(creator));

  React.useEffect(() => {
    if (open) {
      setForm({
        name: collection?.name || "",
        handle: collection?.handle || "",
        description: collection?.description || "",
        thumbnail: collection?.thumbnail || null,
      });
      setError("");
    }
  }, [open, collection]);

  // Default the cover to the newest creation.
  React.useEffect(() => {
    if (open && !form.thumbnail && created.status === "ok" && created.data.length > 0) {
      setForm((f) => ({ ...f, thumbnail: created.data.at(-1) }));
    }
  }, [open, created, form.thumbnail]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const name = form.name.trim();
  const errors = {
    name: name === "" ? "" : name.length > 40 ? "40 characters at most" : "",
    handle:
      editing || form.handle === ""
        ? ""
        : !/^[a-z0-9]+$/.test(form.handle)
          ? "Lowercase letters and numbers only"
          : form.handle.length > 40
            ? "40 characters at most"
            : "",
    description: form.description.length > 500 ? "500 characters at most" : "",
  };
  const valid = name !== "" && form.handle !== "" && form.thumbnail && Object.values(errors).every((x) => x === "");

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // Key order matters: the server re-serializes these fields to verify.
      if (editing) {
        await updateCollection(
          await signPayload({
            timestamp: Date.now(),
            handle: form.handle,
            name,
            thumbnail: form.thumbnail,
            description: form.description,
          })
        );
      } else {
        await createCollection(
          await signPayload({
            timestamp: Date.now(),
            owner,
            handle: form.handle,
            name,
            thumbnail: form.thumbnail,
            description: form.description,
          })
        );
      }
      invalidate(`collection:${form.handle}`, `collection-card:${form.handle}`, "api:collection/queryByOwner");
      toast({ tone: "success", title: editing ? "Collection updated" : "Collection created" });
      onSaved?.();
      onClose();
      if (!editing) {
        navigate(`/collection/${form.handle}`);
      }
    } catch (err) {
      setError(friendly(err.message));
    } finally {
      setSaving(false);
    }
  };

  const noCreations = created.status === "ok" && created.data.length === 0;

  return (
    <Dialog
      open={open}
      onClose={saving ? () => {} : onClose}
      title={editing ? "Edit collection" : "New collection"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="collection-form" busy={saving} disabled={!valid || noCreations}>
            {saving ? "Confirm in your wallet…" : editing ? "Sign and save" : "Sign and create"}
          </Button>
        </>
      }
    >
      <form id="collection-form" className="form" onSubmit={save}>
        <Field label="Name" error={errors.name} counter={counterText(name, 40)}>
          <input className="input" value={form.name} maxLength={60} onChange={set("name")} required />
        </Field>
        <Field
          label="Handle"
          error={errors.handle}
          hint={editing ? "Handles can't be changed." : "Used in the collection's link. It can't be changed later."}
        >
          <div className="input-affix">
            <span className="affix">/collection/</span>
            <input
              className="input"
              value={form.handle}
              maxLength={40}
              disabled={editing}
              autoCapitalize="none"
              spellCheck={false}
              onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value.toLowerCase() }))}
            />
          </div>
        </Field>
        <Field label="Description" optional error={errors.description} counter={counterText(form.description, 500)}>
          <textarea className="input" rows={3} value={form.description} onChange={set("description")} />
        </Field>
        <div className="field">
          <div className="field-top">
            <span className="label">Cover</span>
          </div>
          <p className="field-hint">Choose one of your creations as the collection's cover.</p>
          {noCreations ? (
            <Notice>Create an NFT first; a collection's cover must be one of your creations.</Notice>
          ) : (
            <ThumbnailPicker
              label="Collection cover"
              addresses={created.status === "ok" ? [...created.data].reverse() : undefined}
              value={form.thumbnail}
              onChange={(thumbnail) => setForm((f) => ({ ...f, thumbnail }))}
            />
          )}
        </div>
        {error && <Notice tone="danger">{error}</Notice>}
      </form>
    </Dialog>
  );
}
