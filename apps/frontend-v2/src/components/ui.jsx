import React from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { previewUrl } from "../lib/storage";
import { shortAddress } from "../lib/models";

export function Button({ variant = "primary", size, icon, children, className = "", busy, ...props }) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${size ? `btn-${size}` : ""} ${className}`}
      disabled={busy || props.disabled}
      {...props}
    >
      {busy ? <Spinner size={16} /> : icon && <Icon name={icon} size={size === "sm" ? 15 : 17} />}
      {children}
    </button>
  );
}

export function ButtonLink({ to, href, variant = "primary", size, icon, children, className = "", ...props }) {
  const classes = `btn btn-${variant} ${size ? `btn-${size}` : ""} ${className}`;
  const content = (
    <>
      {icon && <Icon name={icon} size={size === "sm" ? 15 : 17} />}
      {children}
    </>
  );
  return href ? (
    <a className={classes} href={href} target="_blank" rel="noreferrer" {...props}>
      {content}
    </a>
  ) : (
    <Link className={classes} to={to} {...props}>
      {content}
    </Link>
  );
}

export function Spinner({ size = 20 }) {
  return <span className="spinner" style={{ width: size, height: size }} role="status" aria-label="Loading" />;
}

export function Skeleton({ className = "", style }) {
  return <span className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

// Square artwork with a skeleton until the image loads.
export function Artwork({ address, alt = "", className = "", eager }) {
  const [state, setState] = React.useState("loading");
  return (
    <div className={`artwork artwork-${state} ${className}`}>
      {state !== "error" && (
        <img
          src={previewUrl(address)}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
        />
      )}
      {state === "error" && <Icon name="image" size={28} />}
    </div>
  );
}

// Round profile image from the profile's thumbnail NFT, or initials.
export function Avatar({ profile, size = 32 }) {
  const [failed, setFailed] = React.useState(false);
  const thumbnail = profile?.thumbnail;
  const label = (profile?.name || profile?.address || "?").replace(/^D/, "").slice(0, 1).toUpperCase();
  // A stable hue per address keeps fallback avatars distinguishable.
  const hue = [...(profile?.address || "")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);
  return (
    <span className="avatar" style={{ width: size, height: size, "--avatar-hue": hue }}>
      {thumbnail && !failed ? (
        <img src={previewUrl(thumbnail)} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span style={{ fontSize: size * 0.42 }}>{label}</span>
      )}
    </span>
  );
}

export function PersonLink({ profile, label, size = 28 }) {
  if (!profile) {
    return <span className="person muted">—</span>;
  }
  return (
    <Link className="person" to={`/profile/${profile.address}`}>
      <Avatar profile={profile} size={size} />
      <span className="person-text">
        {label && <span className="person-label">{label}</span>}
        <span className="person-name">{profile.name || shortAddress(profile.address)}</span>
      </span>
    </Link>
  );
}

export function CopyButton({ value, label = "Copy" }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      className="icon-btn"
      title={copied ? "Copied" : label}
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked; nothing useful to do.
        }
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={15} />
    </button>
  );
}

export function Price({ sats, size = "md" }) {
  return (
    <span className={`price price-${size}`}>
      <span className="price-value">{sats}</span>
      <span className="price-unit">DINGO</span>
    </span>
  );
}

export function Empty({ icon = "sparkles", title, children, action }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={22} />
      </span>
      <p className="empty-title">{title}</p>
      {children && <p className="empty-text">{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <Empty icon="alert" title="Something went wrong" action={onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}>
      {error?.message || "The request failed."}
    </Empty>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export function Notice({ tone = "info", icon, title, children }) {
  return (
    <div className={`notice notice-${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <Icon name={icon || (tone === "success" ? "check" : "alert")} size={18} />
      <div>
        {title && <strong>{title}</strong>}
        {children && <div className="notice-body">{children}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, actions }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <p className="page-lede">{children}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
