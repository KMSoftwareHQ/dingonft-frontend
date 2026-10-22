import { Artwork, Skeleton } from "./ui";
import Icon from "./Icon";
import { getMeta } from "../lib/storage";
import { useAsync } from "../lib/hooks";
import { nftTitle } from "../lib/models";

function Option({ address, selected, onSelect }) {
  const meta = useAsync(`meta:${address}`, () => getMeta(address));
  const name = meta.data ? nftTitle(meta.data) : "";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`thumb-option ${selected ? "selected" : ""}`}
      onClick={() => onSelect(address)}
      title={name}
    >
      <Artwork address={address} alt={name} />
      {selected && (
        <span className="thumb-check">
          <Icon name="check" size={14} />
        </span>
      )}
    </button>
  );
}

// Pick one of the given NFTs' cover images; `allowNone` adds a "no image" choice.
export default function ThumbnailPicker({ addresses, value, onChange, allowNone, label }) {
  if (addresses === undefined) {
    return (
      <div className="thumb-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="thumb-option" />
        ))}
      </div>
    );
  }
  return (
    <div className="thumb-grid" role="radiogroup" aria-label={label}>
      {allowNone && (
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          className={`thumb-option thumb-none ${value === null ? "selected" : ""}`}
          onClick={() => onChange(null)}
        >
          <Icon name="x" size={20} />
          <span>None</span>
        </button>
      )}
      {addresses.map((address) => (
        <Option key={address} address={address} selected={value === address} onSelect={onChange} />
      ))}
    </div>
  );
}
