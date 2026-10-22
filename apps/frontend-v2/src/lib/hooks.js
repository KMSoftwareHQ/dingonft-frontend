import React from "react";

// Runs load() whenever key changes; key null skips. Returns
// { status: "loading" | "ok" | "error", data, error, reload }.
export const useAsync = (key, load) => {
  const loadRef = React.useRef(load);
  loadRef.current = load;
  const [nonce, setNonce] = React.useState(0);
  const [state, setState] = React.useState({ status: "loading", key: null });

  React.useEffect(() => {
    if (key === null) {
      return undefined;
    }
    let live = true;
    setState((s) => (s.key === key ? s : { status: "loading", key }));
    loadRef.current().then(
      (data) => live && setState({ status: "ok", data, key }),
      (error) => live && setState({ status: "error", error, key })
    );
    return () => {
      live = false;
    };
  }, [key, nonce]);

  const reload = React.useCallback(() => setNonce((n) => n + 1), []);
  // A stale result from the previous key reads as loading.
  return state.key === key ? { ...state, reload } : { status: "loading", reload };
};

// True once the element has come within `margin` of the viewport.
export const useVisible = (margin = "300px") => {
  const ref = React.useRef(null);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const element = ref.current;
    if (!element || visible) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
        }
      },
      { rootMargin: margin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [margin, visible]);
  return [ref, visible];
};

export const useDocumentTitle = (title) => {
  React.useEffect(() => {
    document.title = title ? `${title} · Dingocoin NFT` : "Dingocoin NFT";
  }, [title]);
};
