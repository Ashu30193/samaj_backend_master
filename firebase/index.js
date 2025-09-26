const admin = require('firebase-admin');
const firebaseCerds = require('../watchsocials-firebase.json');

exports.firebase = admin.initializeApp({
  credential: admin.credential.cert(firebaseCerds),
});
