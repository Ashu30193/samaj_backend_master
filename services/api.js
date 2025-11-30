const jwt = require("jsonwebtoken");
const SMS_URL = "https://businesssms.co.in/SMSV1/SubmitSMS";
const AUTH_URL = "https://businesssms.co.in/AuthTokenV1/AuthToken";

const success_URL = "https://businesssms.co.in/SMSV1/SubmitSMS";
const failure_URL = "https://businesssms.co.in/SMSV1/SubmitSMS";
const axios = require("axios");

exports.notverifiednotification = (phone) => {
  return new Promise(async (resolve, reject) => {
    try {
      let params = {
        userID: process.env.SMS_USER_ID,
        password: process.env.SMS_PASSWORD,
      };
      axios
        .get(AUTH_URL, {
          params,
        })
        .then(function (response) {
          let TOKEN = response.data.TxnOutcome;
          let body = {
            phNo: phone,
            text: process.env.NOT_VERIFIED_SMS_TEXT || "Your account verification is pending.",
            senderID: process.env.SMS_SENDER_ID,
            templateId: process.env.NOT_VERIFIED_TEMPLATE_ID,
          };
          const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${response.data.TxnOutcome}`,
          };
          axios
            .post(failure_URL, body, {
              headers: headers,
            })
            .then(function (result) {
              resolve({ status: true });
            })
            .catch(function (error) {
              resolve({ status: false });
            });
        })
        .catch(function (error) {
          resolve({ status: false });
        });
    } catch (error) {
      reject({ status: false });
    }
  });
};

exports.verifiednotification = (phone) => {
  return new Promise(async (resolve, reject) => {
    try {
      let params = {
        userID: process.env.SMS_USER_ID,
        password: process.env.SMS_PASSWORD,
      };
      axios
        .get(AUTH_URL, {
          params,
        })
        .then(function (response) {
          let TOKEN = response.data.TxnOutcome;
          let body = {
            phNo: phone,
            text: process.env.VERIFIED_SMS_TEXT || "Your account has been verified!",
            senderID: process.env.SMS_SENDER_ID,
            templateId: process.env.VERIFIED_TEMPLATE_ID,
          };

          const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${response.data.TxnOutcome}`,
          };

          axios
            .post(success_URL, body, {
              headers: headers,
            })
            .then(function (result) {
              resolve({ status: true });
            })
            .catch(function (error) {
              resolve({ status: false });
            });
        })
        .catch(function (error) {
          resolve({ status: false });
        });
    } catch (error) {
      reject({ status: false });
    }
  });
};
const signupnotification = (phone) => {
  return new Promise(async (resolve, reject) => {
    try {
      let params = {
        userID: process.env.SMS_USER_ID,
        password: process.env.SMS_PASSWORD,
      };
      axios
        .get(AUTH_URL, {
          params,
        })
        .then(function (response) {
          let body = {
            phNo: phone,
            text: process.env.SIGNUP_SMS_TEXT || "Welcome! Thank you for signing up.",
            senderID: process.env.SMS_SENDER_ID,
            templateId: process.env.SIGNUP_TEMPLATE_ID,
          };

          const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${response.data.TxnOutcome}`,
          };

          axios
            .post(SMS_URL, body, {
              headers: headers,
            })
            .then(function (result) {
              resolve({ status: true });
            })
            .catch(function (error) {
              resolve({ status: false });
            });
        })
        .catch(function (error) {
          resolve({ status: false });
        });
    } catch (error) {
      reject({ status: false });
    }
  });
};

exports.forgetPasswordNotification = (phone, otp) => {
  return new Promise(async (resolve, reject) => {
    try {
      let params = {
        userID: process.env.SMS_USER_ID,
        password: process.env.SMS_PASSWORD,
      };
      axios
        .get(AUTH_URL, {
          params,
        })
        .then(function (response) {
          let body = {
            phNo: phone,
            text: otp + " " + (process.env.OTP_SMS_TEXT || "is your OTP"),
            senderID: process.env.SMS_SENDER_ID,
            templateId: "1007721507947005142",
          };

          console.log({ body });

          const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${response.data.TxnOutcome}`,
          };

          axios
            .post(SMS_URL, body, {
              headers: headers,
            })
            .then(function (result) {
              console.log({ result });
              resolve({ status: true });
            })
            .catch(function (error) {
              console.log({ error });
              reject({ status: false });
            });
        })
        .catch(function (error) {
          console.log({ error });
          reject({ status: false });
        });
    } catch (error) {
      reject({ status: false });
    }
  });
};

module.exports.signupnotification = signupnotification;
