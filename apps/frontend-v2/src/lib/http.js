// The provider answers most failures with HTTP 200 and { error: "..." }.
export class ApiError extends Error {
  constructor(message) {
    super(message);
    this.name = "ApiError";
  }
}

const unwrap = (result) => {
  if (
    result !== null &&
    typeof result === "object" &&
    !Array.isArray(result) &&
    typeof result.error === "string"
  ) {
    throw new ApiError(result.error);
  }
  return result;
};

const parse = (status, text) => {
  let body;
  try {
    body = text === "" ? null : JSON.parse(text);
  } catch {
    throw new ApiError(`Unexpected response (HTTP ${status})`);
  }
  if (status >= 400 && !(body && typeof body.error === "string")) {
    throw new ApiError(`Request failed (HTTP ${status})`);
  }
  return unwrap(body);
};

export const postJson = async (url, data, { timeout = 60_000 } = {}) => {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(timeout),
    });
  } catch (err) {
    throw new ApiError(
      err.name === "TimeoutError" ? "The request timed out" : "Network error"
    );
  }
  return parse(response.status, await response.text());
};

// fetch() has no upload progress, so large uploads use XHR.
export const postJsonWithProgress = (url, data, onProgress, { timeout = 300_000 } = {}) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.timeout = timeout;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.upload.onprogress = (e) => {
      onProgress?.(e.lengthComputable ? e.loaded / e.total : null);
    };
    xhr.onload = () => {
      try {
        resolve(parse(xhr.status, xhr.responseText));
      } catch (err) {
        reject(err);
      }
    };
    xhr.onerror = () => reject(new ApiError("Network error"));
    xhr.ontimeout = () => reject(new ApiError("The upload timed out"));
    xhr.send(JSON.stringify(data));
  });

export const getJson = async (url, { timeout = 15_000 } = {}) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  // Missing and private objects are both "not there" to the app.
  if (response.status === 404 || response.status === 403) {
    return null;
  }
  if (!response.ok) {
    throw new ApiError(`Storage request failed (HTTP ${response.status})`);
  }
  return response.json();
};
