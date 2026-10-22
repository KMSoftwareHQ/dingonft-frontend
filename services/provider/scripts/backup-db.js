// Uploads a database dump read from stdin to the private backup bucket
// (<STORAGE_BUCKET_PREFIX>-backup), then deletes uploads older than the
// retention period. scripts/backup-db.sh at the repo root pipes pg_dump into it:
//
//   pg_dump -Fc ... | docker compose ... exec -T provider node scripts/backup-db.js
//
// Options:
//   --keep-days=N   delete backups older than N days (default 30; 0 keeps all)
//   --name=NAME     object name (default db/<UTC timestamp>.dump)
//
// The bucket must already exist and stay private: dumps contain everything in
// the database. Objects are uploaded with ACL private.
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const { S3_CONFIG } = require("../storage");

const args = process.argv.slice(2);
const option = (name) => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg && arg.slice(name.length + 3);
};
const unknown = args.filter((a) => !/^--(keep-days=\d+|name=.+)$/.test(a));
if (unknown.length > 0) {
  console.error(`Unknown arguments: ${unknown.join(" ")}`);
  process.exit(2);
}
const keepDays = Number(option("keep-days") ?? 30);
const bucket = `${process.env.STORAGE_BUCKET_PREFIX || "dingo-nftc-0"}-backup`;
const name = option("name") || `db/${new Date().toISOString().replace(/[:.]/g, "-")}.dump`;

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

(async () => {
  const s3 = new S3Client(S3_CONFIG);
  const body = await readStdin();
  // A custom-format pg_dump starts with "PGDMP"; anything else is a failed dump.
  if (body.length === 0 || body.subarray(0, 5).toString() !== "PGDMP") {
    console.error(`Refusing to upload: stdin is not a pg_dump custom-format archive (${body.length} bytes)`);
    process.exit(1);
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: name,
      Body: body,
      ContentType: "application/octet-stream",
      ACL: "private",
    })
  );
  console.log(`Uploaded ${name} (${body.length} bytes) to ${bucket}`);

  if (keepDays === 0) {
    return;
  }
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  const expired = [];
  let token;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: "db/", ContinuationToken: token })
    );
    for (const object of page.Contents || []) {
      if (object.Key !== name && object.LastModified.getTime() < cutoff) {
        expired.push({ Key: object.Key });
      }
    }
    token = page.NextContinuationToken;
  } while (token);
  for (let i = 0; i < expired.length; i += 1000) {
    await s3.send(
      new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: expired.slice(i, i + 1000) } })
    );
  }
  console.log(`Deleted ${expired.length} backup(s) older than ${keepDays} days`);
})().catch((err) => {
  console.error(`Backup upload failed: ${err.name}: ${err.message}`);
  process.exit(1);
});
