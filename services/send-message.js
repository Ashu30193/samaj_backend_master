// Initialize Twilio client
let twilioClient = null;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (accountSid && authToken && accountSid.startsWith('AC')) {
  try {
    twilioClient = require("twilio")(accountSid, authToken);
    console.log("[Twilio] Initialized successfully");
  } catch (err) {
    console.log("[Twilio] Initialization failed:", err.message);
  }
} else {
  console.log("[Twilio] Credentials not configured - SMS features will be disabled");
}

/**
 * send message using Twilio.
 * @param {*} message
 * @param {*} mobile
 */
function sendSMS(message, mobile) {
  return new Promise((resolve, reject) => {
    if (!twilioClient) {
      console.log("[Twilio] Client not initialized, SMS not sent");
      return reject(new Error("Twilio client not initialized"));
    }

    // Ensure mobile number has country code
    let formattedMobile = mobile;
    if (!mobile.startsWith('+')) {
      formattedMobile = '+91' + mobile; // Default to India country code
    }

    console.log("[Twilio] Sending SMS to:", formattedMobile);

    twilioClient.messages
      .create({
        body: message,
        from: twilioPhoneNumber,
        to: formattedMobile
      })
      .then((messageResponse) => {
        console.log("[Twilio] SMS sent successfully, SID:", messageResponse.sid);
        resolve(messageResponse);
      })
      .catch((err) => {
        console.log("[Twilio] SMS failed:", err.message);
        reject(err);
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
