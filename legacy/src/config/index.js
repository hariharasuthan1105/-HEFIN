require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/hefin',
  jwtSecret: process.env.JWT_SECRET || 'defaultsecret'
};
