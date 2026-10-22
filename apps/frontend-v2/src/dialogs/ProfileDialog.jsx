import React from "react";
import Dialog from "../components/Dialog";
import Field, { counterText } from "../components/Field";
import ThumbnailPicker from "../components/ThumbnailPicker";
import { Button, Notice } from "../components/ui";
import { useToast } from "../components/Toasts";
import { getProfileHistoricalNfts, updateProfile } from "../lib/api";
import { invalidate } from "../lib/cache";
import { useAsync } from "../lib/hooks";
import { signPayload } from "../lib/wallet";

const friendly = (message) =>
  ({
    "Wrong signature": "The wallet's active account doesn't own this profile.",
    "Request expired": "The signature took too long. Try again.",
  })[message] || message;

export default function ProfileDialog({ open, onClose, profile, onSaved }) {
  const [name, setName] = React.useState("");
  const [thumbnail, setThumbnail] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const toast = useToast();
  // Any NFT the profile has created or owned can be its picture.
  const nfts = useAsync(open ? `historical:${profile.address}` : null, () =>
    getProfileHistoricalNfts(profile.address)
  );

  React.useEffect(() => {
    if (open) {
      setName(profile.name || "");
      setThumbnail(profile.thumbnail || null);
      setError("");
    }
  }, [open, profile]);

  const trimmed = name.trim();
  const nameError = trimmed.length > 40 ? "40 characters at most" : "";

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // Key order matters: the server re-serializes these fields to verify.
      const payload = await signPayload({
        timestamp: Date.now(),
        owner: profile.address,
        name: trimmed,
        thumbnail,
      });
      await updateProfile(payload);
      invalidate(`profile:${profile.address}`, `profile-card:${profile.address}`);
      toast({ tone: "success", title: "Profile updated" });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(friendly(err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? () => {} : onClose}
      title="Edit profile"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="profile-form" busy={saving} disabled={nameError !== ""}>
            {saving ? "Confirm in your wallet…" : "Sign and save"}
          </Button>
        </>
      }
    >
      <form id="profile-form" className="form" onSubmit={save}>
        <Field label="Display name" optional error={nameError} counter={counterText(trimmed, 40)}>
          <input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="field">
          <div className="field-top">
            <span className="label">Profile picture</span>
          </div>
          <p className="field-hint">Use the cover of any NFT you've created or owned.</p>
          {nfts.status === "ok" && nfts.data.length === 0 ? (
            <Notice>Create or collect an NFT to use it as your profile picture.</Notice>
          ) : (
            <ThumbnailPicker
              label="Profile picture"
              allowNone
              addresses={nfts.status === "ok" ? [...nfts.data].reverse() : undefined}
              value={thumbnail}
              onChange={setThumbnail}
            />
          )}
        </div>
        {error && <Notice tone="danger">{error}</Notice>}
      </form>
    </Dialog>
  );
}
