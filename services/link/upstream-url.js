// Builds the URL a proxied request is forwarded to: the configured upstream's
// origin and base path, followed by the request's own path and query.
//
// Never resolve the request URL against the upstream with `new URL(url, base)`.
// A request path such as "//host/x" or "/http://host/x" is then read as an
// absolute URL, which replaces the upstream host and lets anyone make this
// server fetch any address on its network (server-side request forgery).
const upstreamUrl = (upstreamBase, requestUrl) => {
  const target = new URL(upstreamBase);
  const queryStart = requestUrl.indexOf('?');
  const requestPath = queryStart === -1 ? requestUrl : requestUrl.slice(0, queryStart);
  const basePath = target.pathname.replace(/\/+$/, '');
  // Setting pathname only ever changes the path, whatever it contains, but it
  // resolves ".." segments, so check they did not climb out of the base path.
  target.pathname = `${basePath}/${requestPath.replace(/^[/\\]+/, '')}`;
  if (!target.pathname.startsWith(`${basePath}/`)) {
    throw Object.assign(new Error('Request path leaves the upstream base path'), { status: 400 });
  }
  target.search = queryStart === -1 ? '' : requestUrl.slice(queryStart);
  target.hash = '';
  return target;
};

module.exports = { upstreamUrl };
