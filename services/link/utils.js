const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const { FETCH_TIMEOUT_MS } = require('./config');

const post = async (link, data) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
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
  };

const get = (link) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(link, {
withCredentials: true,
method: "GET",
signal: controller.signal,
});
};

module.exports = { 
  post, 
  get 
};
