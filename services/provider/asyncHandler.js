"use strict";

// Wraps an async Express handler. Errors are logged in full on the server, but
// clients only get a generic message: stack traces expose file paths, query
// text, and dependency internals.
function asyncHandler(fn) {
  return async function (req, res) {
    try {
      return await fn(req, res);
    } catch (err) {
      console.log(`>>>>> ERROR START [${new Date().toUTCString()}] >>>>>\n`);
      console.log(err);
      console.log("<<<<<< ERROR END <<<<<<\n");
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  };
}

module.exports = asyncHandler;
