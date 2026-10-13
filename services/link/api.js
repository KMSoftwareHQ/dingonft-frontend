const { post } = require("./utils");

const { API_URL } = require("./config");

const getCollection = (data) => {
    return post(`${API_URL}/collection/get`, {
          handle: data.handle,
            });
};

module.exports = {
  getCollection
};
