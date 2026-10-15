// Finds objects in the public buckets that browsers can't read, and with
// --apply makes them public-read again. Objects uploaded without the ACL
// (as older provider versions did) are private on DigitalOcean Spaces.
//
// Uses the provider's S3_* / STORAGE_* environment, so on the production host:
//   docker compose -f compose.prod.yaml --env-file .env.prod exec provider node scripts/repair-acl.js
//   docker compose -f compose.prod.yaml --env-file .env.prod exec provider node scripts/repair-acl.js --apply
//
// Options:
//   --apply             set public-read on every unreadable object (default: report only)
//   --bucket=state,...  only check these buckets (suffix after the prefix)
//   --concurrency=N     parallel requests (default 16)
//
// Readability is checked with an anonymous HEAD, exactly as a browser would
// see it, against STORAGE_PUBLIC_BASE (path-style), else S3_ENDPOINT.
// Exits 1 if any object is still unreadable at the end.
const {
  S3Client,
  ListObjectsV2Command,
  PutObjectAclCommand,
} = require("@aws-sdk/client-s3");
const { S3_CONFIG, PUBLIC_BUCKETS } = require("../storage");

const args = process.argv.slice(2);
const option = (name) => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg && arg.slice(name.length + 3);
};
const unknown = args.filter((a) => !/^--(apply|bucket=.+|concurrency=\d+)$/.test(a));
if (unknown.length > 0) {
  console.error(`Unknown arguments: ${unknown.join(" ")}`);
  process.exit(2);
}
const apply = args.includes("--apply");
const concurrency = Number(option("concurrency") || 16);
const only = option("bucket")?.split(",");
const buckets = only
  ? PUBLIC_BUCKETS.filter((b) => only.some((suffix) => b.endsWith(`-${suffix}`)))
  : PUBLIC_BUCKETS;
if (only && buckets.length !== only.length) {
  console.error(`--bucket must be among: ${PUBLIC_BUCKETS.join(", ")}`);
  process.exit(2);
}

const publicBase = (process.env.STORAGE_PUBLIC_BASE || S3_CONFIG.endpoint).replace(/\/+$/, "");
if (!publicBase) {
  console.error("Set STORAGE_PUBLIC_BASE or S3_ENDPOINT.");
  process.exit(2);
}
const publicUrl = (bucket, key) =>
  `${publicBase}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;

const s3 = new S3Client(S3_CONFIG);

async function* listKeys(bucket) {
  let ContinuationToken;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken }));
    for (const object of page.Contents || []) {
      yield object.Key;
    }
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (ContinuationToken);
}

// Anonymous HEAD status, retrying network errors and 5xx/429.
const readStatus = async (bucket, key) => {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(publicUrl(bucket, key), { method: "HEAD", cache: "no-store" });
      if ((res.status < 500 && res.status !== 429) || attempt === 4) {
        return res.status;
      }
    } catch (err) {
      if (attempt === 4) {
        return `error: ${err.cause?.code || err.message}`;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
};

// Runs fn over an async iterable with at most `limit` calls in flight.
const forEachLimited = async (iterable, limit, fn) => {
  const running = new Set();
  for await (const item of iterable) {
    const p = fn(item).finally(() => running.delete(p));
    running.add(p);
    if (running.size >= limit) {
      await Promise.race(running);
    }
  }
  await Promise.all(running);
};

const main = async () => {
  console.log(`${apply ? "Repairing" : "Checking (dry run)"} ${buckets.join(", ")} via ${publicBase}`);
  let remaining = 0;

  for (const bucket of buckets) {
    let checked = 0;
    let fixed = 0;
    const broken = [];

    await forEachLimited(listKeys(bucket), concurrency, async (key) => {
      checked++;
      const status = await readStatus(bucket, key);
      if (status === 200) {
        return;
      }
      if (apply && status === 403) {
        try {
          await s3.send(new PutObjectAclCommand({ Bucket: bucket, Key: key, ACL: "public-read" }));
          const after = await readStatus(bucket, key);
          if (after === 200) {
            fixed++;
            console.log(`  fixed ${bucket}/${key}`);
            return;
          }
          broken.push(`${key} (${after} after setting ACL)`);
        } catch (err) {
          broken.push(`${key} (set ACL failed: ${err.name}: ${err.message})`);
        }
        return;
      }
      broken.push(`${key} (${status})`);
    });

    for (const line of broken.sort()) {
      console.log(`  unreadable ${bucket}/${line}`);
    }
    console.log(`${bucket}: ${checked} checked, ${fixed} fixed, ${broken.length} unreadable`);
    remaining += broken.length;
  }

  if (remaining > 0) {
    if (!apply) {
      console.log("Run again with --apply to make them public-read.");
    }
    process.exitCode = 1;
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
