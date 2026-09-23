FROM ubuntu:22.04

# Checksummed build from the v1.18.1.1 release page (listed in its shasum.txt).
ARG DINGOCOIN_ZIP=dingocoin-ce1acdabe819bd2e4194ab5a0f2897f26283ccfc-x86_64-linux-ubuntu-22.zip
ARG DINGOCOIN_SHA256=42baf227cb75a425630f19531301bd892d65a8a43c9504e1837fc10710c6c303
ARG DINGOCOIN_TAG=v1.18.1.1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl unzip \
  && curl -fsSL -o /tmp/dingo.zip "https://github.com/dingocoin/dingocoin/releases/download/${DINGOCOIN_TAG}/${DINGOCOIN_ZIP}" \
  && echo "${DINGOCOIN_SHA256}  /tmp/dingo.zip" | sha256sum -c - \
  && unzip -q /tmp/dingo.zip -d /tmp/dingo \
  && install -m 0755 /tmp/dingo/depends/x86_64-linux-gnu/bin/dingocoind /tmp/dingo/depends/x86_64-linux-gnu/bin/dingocoin-cli /usr/local/bin/ \
  && rm -rf /tmp/dingo /tmp/dingo.zip /var/lib/apt/lists/* \
  && useradd -m dingo \
  && mkdir -p /home/dingo/.dingocoin /rpc \
  && chown dingo:dingo /home/dingo/.dingocoin /rpc

USER dingo
VOLUME ["/home/dingo/.dingocoin", "/rpc"]

# RPC is only reachable on the compose network (the port is not published) and uses cookie auth.
# txindex is required: the provider calls getrawtransaction on arbitrary historical txids.
CMD ["dingocoind", "-printtoconsole", "-txindex=1", "-server=1", \
     "-rpcbind=0.0.0.0", "-rpcallowip=0.0.0.0/0", "-rpcport=34646", \
     "-rpccookiefile=/rpc/.cookie", "-dbcache=1024"]
