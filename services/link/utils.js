const { FETCH_TIMEOUT_MS } = require('./config');

const post = async (link, data) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return (
      await fetch(link, {
withCredentials: true,
method: "POST",
signal: controller.signal,
headers: {
Accept: "application/json",
"Content-Type": "application/json",
},
body: JSON.stringify(data),
})
      ).json();
  } finally {
    clearTimeout(timeout);
  }
  };

const get = (link) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(link, {
withCredentials: true,
method: "GET",
signal: controller.signal,
}).finally(() => clearTimeout(timeout));
};

module.exports = { 
  post, 
  get 
};
