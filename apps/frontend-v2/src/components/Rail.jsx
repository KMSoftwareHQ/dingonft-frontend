import React from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";

// Horizontally scrolling row with snap points and arrow buttons.
export default function Rail({ title, icon, to, linkLabel = "View all", children, loading }) {
  const track = React.useRef(null);
  const [edges, setEdges] = React.useState({ start: true, end: false });

  const update = React.useCallback(() => {
    const el = track.current;
    if (el) {
      setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    }
  }, []);

  React.useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update, children]);

  const scroll = (direction) => {
    const el = track.current;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="rail">
      <div className="rail-head">
        <h2>
          {icon && <Icon name={icon} size={20} />}
          {title}
        </h2>
        <div className="rail-controls">
          {to && (
            <Link to={to} className="text-link">
              {linkLabel} <Icon name="arrowRight" size={15} />
            </Link>
          )}
          <button type="button" className="icon-btn bordered" onClick={() => scroll(-1)} disabled={edges.start} aria-label="Scroll left">
            <Icon name="chevronLeft" />
          </button>
          <button type="button" className="icon-btn bordered" onClick={() => scroll(1)} disabled={edges.end} aria-label="Scroll right">
            <Icon name="chevronRight" />
          </button>
        </div>
      </div>
      <div className="rail-track" ref={track} onScroll={update} aria-busy={loading || undefined}>
        {children}
      </div>
    </section>
  );
}
