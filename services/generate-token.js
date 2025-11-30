const jwt = require('jsonwebtoken');

//Generate a new access token.
const generateJWTToken = (user) => {
  const token = jwt.sign(
    {
      type: user.role.name === 'root' ? 'root' : 'user',
      access: ['read', 'write'],
      data: user,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: 86400,
    }
  );
  delete user.password;
  return {
    message: 'Refreshed token!',
    token_type: 'Bearer',
    token: token,
    data: user,
  };
};

module.exports.generateJWTToken = generateJWTToken;
