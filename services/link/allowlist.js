const net = require("node:net");
const cloudflareRanges = require("./cloudflare-ranges");

const normalise = (ip) => (ip || "").replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, "");
const family = (ip) => (net.isIPv6(ip) ? "ipv6" : "ipv4");

const toBlockList = (entries) => {
  const list = new net.BlockList();
  for (const entry of entries) {
    const [address, prefix] = entry.split("/");
    if (prefix === undefined) {
      list.addAddress(address, family(address));
    } else {
      list.addSubnet(address, Number(prefix), family(address));
    }
  }
  return list;
};

const cloudflare = toBlockList(cloudflareRanges);
const inList = (list, ip) => net.isIP(ip) !== 0 && list.check(ip, family(ip));

// Client IP: CF-Connecting-IP only when the TCP peer is a Cloudflare edge
// address, so the header cannot be forged by connecting to the origin directly.
const clientIp = (req) => {
  const peer = normalise(req.socket.remoteAddress);
  const forwarded = req.headers["cf-connecting-ip"];
  if (forwarded && inList(cloudflare, peer)) {
    return normalise(String(forwarded).trim());
  }
  return peer;
};

// Returns middleware that allows only the given IPs/CIDRs, or null when the
// list is empty (allowlist disabled).
const createAllowlist = (entries) => {
  if (entries.length === 0) {
    return null;
  }
  const allowed = toBlockList(entries);
  return (req, res, next) => {
    if (inList(allowed, clientIp(req))) {
      return next();
    }
    res.status(403).type("text/plain").send("Forbidden");
  };
};

module.exports = { createAllowlist, clientIp };
