import { NavLink } from "react-router-dom";

// Route-backed tabs: each tab is a link, so tabs are shareable URLs.
export function RouteTabs({ tabs, label }) {
  return (
    <nav className="tabs" aria-label={label}>
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end ?? true} className="tab" replace={tab.replace}>
          {tab.label}
          {tab.count !== undefined && tab.count !== null && <span className="tab-count">{tab.count}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

// Button-backed segmented control for in-page state.
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
