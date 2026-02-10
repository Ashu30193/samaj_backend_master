const axios = require("axios");

// Chartered Info SMS API Configuration
const AUTH_URL = "https://messaging.charteredinfo.com/AuthTokenV1/AuthToken";
const SMS_URL = "https://messaging.charteredinfo.com/SMSV1/SubmitSMS";

// Cache for auth token to avoid repeated auth calls
let cachedToken = null;
let tokenExpiry = null;

/**
 * Get authentication token from Chartered Info API
 * Caches token and reuses until 5 minutes before expiry
 */
const getAuthToken = async () => {
  try {
    // Check if we have a valid cached token (with 5 min buffer)
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 5 * 60 * 1000) {
      return cachedToken;
    }

    const response = await axios.post(AUTH_URL, {
      UserId: process.env.SMS_USER_ID,
      Password: process.env.SMS_PASSWORD,
    }, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.data.IsSuccess && response.data.TxnOutcome) {
      cachedToken = response.data.TxnOutcome;

      // Decode JWT to get expiry time
      try {
        const payload = JSON.parse(Buffer.from(cachedToken.split('.')[1], 'base64').toString());
        tokenExpiry = payload.exp * 1000; // Convert to milliseconds
      } catch (e) {
        // If we can't decode, set expiry to 1 hour from now
        tokenExpiry = Date.now() + 60 * 60 * 1000;
      }

      console.log("[SMS] Auth token obtained successfully");
      return cachedToken;
    } else {
      console.error("[SMS] Auth failed:", response.data.ErrorCode);
      throw new Error(response.data.ErrorCode || "Authentication failed");
    }
  } catch (error) {
    console.error("[SMS] Auth error:", error.message);
    throw error;
  }
};

/**
 * Send SMS using Chartered Info API
 * @param {string} phone - Phone number with country code (e.g., "919897144223")
 * @param {string} text - SMS message text
 * @param {string} templateId - DLT Template ID
 * @param {string} senderId - Optional sender ID (defaults to env variable)
 */
const sendSMS = async (phone, text, templateId, senderId = null) => {
  try {
    const token = await getAuthToken();

    const payload = {
      SMSContent: [
        {
          PhNo: phone.startsWith("91") ? phone : `91${phone}`,
          Text: text,
          SenderID: senderId || process.env.SMS_SENDER_ID,
          DlrUrl: "",
          ScheduleAt: "",
          PE: process.env.SMS_PE_ID || "1001512283021871019",
          TemplateId: templateId,
        },
      ],
    };

    console.log("[SMS] Sending to:", phone, "Template:", templateId);

    const response = await axios.post(SMS_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("[SMS] Response:", JSON.stringify(response.data));
    return { status: true, data: response.data };
  } catch (error) {
    console.error("[SMS] Send error:", error.response?.data || error.message);
    return { status: false, error: error.message };
  }
};

/**
 * Send OTP SMS
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 */
exports.sendOTP = async (phone, otp) => {
  const text = `${otp} ${process.env.OTP_SMS_TEXT || "is your OTP for Pareek Samaj App. Do not share with anyone."}`;
  const templateId = process.env.OTP_TEMPLATE_ID || "1007721507947005142";
  return sendSMS(phone, text, templateId);
};

/**
 * Send signup notification
 * @param {string} phone - Phone number
 */
exports.signupnotification = async (phone) => {
  const text = process.env.SIGNUP_SMS_TEXT || "Welcome to Pareek Samaj App! Thank you for signing up.";
  const templateId = process.env.SIGNUP_TEMPLATE_ID;

  if (!templateId) {
    console.log("[SMS] Signup template ID not configured, skipping SMS");
    return { status: true };
  }

  return sendSMS(phone, text, templateId);
};

/**
 * Send account verified notification
 * @param {string} phone - Phone number
 */
exports.verifiednotification = async (phone) => {
  const text = process.env.VERIFIED_SMS_TEXT || "Congratulations! Your account details have been verified. Please login into Pareek Samaj App to enjoy amazing services.";
  const templateId = process.env.VERIFIED_TEMPLATE_ID || "1007757185609678786";
  return sendSMS(phone, text, templateId);
};

/**
 * Send account not verified notification
 * @param {string} phone - Phone number
 */
exports.notverifiednotification = async (phone) => {
  const text = process.env.NOT_VERIFIED_SMS_TEXT || "Your account verification is pending. Please complete verification to access all features.";
  const templateId = process.env.NOT_VERIFIED_TEMPLATE_ID;

  if (!templateId) {
    console.log("[SMS] Not verified template ID not configured, skipping SMS");
    return { status: true };
  }

  return sendSMS(phone, text, templateId);
};

/**
 * Send forget password OTP notification
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 */
exports.forgetPasswordNotification = async (phone, otp) => {
  const text = `${otp} ${process.env.OTP_SMS_TEXT || "is your OTP for password reset on Pareek Samaj App. Do not share with anyone."}`;
  const templateId = process.env.OTP_TEMPLATE_ID || "1007721507947005142";
  return sendSMS(phone, text, templateId);
};

// Export helper functions for direct use
exports.getAuthToken = getAuthToken;
exports.sendSMS = sendSMS;
