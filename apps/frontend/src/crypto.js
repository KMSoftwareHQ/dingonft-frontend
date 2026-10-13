const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

const sha256Hex = async (value) => {
  const data =
    typeof value === "string"
      ? new TextEncoder().encode(value)
      : value instanceof Blob
        ? await value.arrayBuffer()
        : value;
  return toHex(await crypto.subtle.digest("SHA-256", data));
};

export { sha256Hex };
