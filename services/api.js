const jwt = require("jsonwebtoken");
var config = require("../config.json");
const SMS_URL = "https://businesssms.co.in/SMSV1/SubmitSMS";
const AUTH_URL = "https://businesssms.co.in/AuthTokenV1/AuthToken";

const success_URL = "https://businesssms.co.in/SMSV1/SubmitSMS";
const failure_URL = "https://businesssms.co.in/SMSV1/SubmitSMS";
const axios = require("axios");

exports.notverifiednotification = (phone) => {
  return new Promise(async (resolve, reject) => {
    try {
      let params = {
        userID: config.loginCredentials.userID,
        password: config.loginCredentials.password,
      };
      axios
        .get(AUTH_URL, {
          params,
        })
        .then(function (response) {
          let TOKEN = response.data.TxnOutcome;
          let body = {
            phNo: phone,
            text: config.notVerifiedNotification.text,
            senderID: config.notVerifiedNotification.senderID,
            templateId: config.notVerifiedNotification.templateId,
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
        userID: config.loginCredentials.userID,
        password: config.loginCredentials.password,
      };
      axios
        .get(AUTH_URL, {
          params,
        })
        .then(function (response) {
          let TOKEN = response.data.TxnOutcome;
          let body = {
            phNo: phone,
            text: config.verifiedNotification.text,
            senderID: config.verifiedNotification.senderID,
            templateId: config.verifiedNotification.templateId,
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
        userID: config.loginCredentials.userID,
        password: config.loginCredentials.password,
      };
      axios
        .get(AUTH_URL, {
          params,
        })
        .then(function (response) {
          let body = {
            phNo: phone,
            text: config.signupNotification.text,
            senderID: config.signupNotification.senderID,
            templateId: config.signupNotification.templateId,
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
        userID: config.loginCredentials.userID,
        password: config.loginCredentials.password,
      };
      axios
        .get(AUTH_URL, {
          params,
        })
        .then(function (response) {
          let body = {
            phNo: phone,
            text: otp + " " + config.otpNotification.text,
            senderID: config.otpNotification.senderID,
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
