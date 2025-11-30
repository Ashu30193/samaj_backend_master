const jwt = require("jsonwebtoken");

//decode the access token.
const decodetoken = (req) => {
  if (req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2) {
      const credentials = parts[1];
      const token = credentials;
      var decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      return decodedToken;
    }
  }
};

module.exports.decodetoken = decodetoken;
