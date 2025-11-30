const AWS = require("aws-sdk");

AWS.config.region = process.env.AWS_REGION || "us-east-1";
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
const sns = new AWS.SNS();

/**
 * send message.
 * @param {*} message
 * @param {*} mobile
 */
function sendSMS(message, mobile) {
  return new Promise((resolve, reject) => {
    var params = {
      Message: message,
      MessageStructure: "string",
      PhoneNumber: mobile,
      MessageAttributes: {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional",
        },
      },
    };

    sns.publish(params, function (err, message) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        console.log(message);
        resolve(message);
      }
    });
  });
}

/**
 *  generate OTP.
 */
exports.generateOTP = () => {
  var digits = "0123456789";
  var otpLength = 4;
  var otp = "";
  for (let i = 1; i <= otpLength; i++) {
    var index = Math.floor(Math.random() * digits.length);
    otp = otp + digits[index];
  }
  return otp;
};

module.exports.sendSMS = sendSMS;
