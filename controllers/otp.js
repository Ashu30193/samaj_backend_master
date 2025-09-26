const jwt = require("jsonwebtoken");
var config = require("../config.json");
const SMS_URL = "https://businesssms.co.in/SMSV1/SubmitSMS";
const AUTH_URL = "https://businesssms.co.in/AuthTokenV1/AuthToken";
const sendMessage = require("../services/send-message");
const User = require("../models/user");
const Usersotps = require("../models/otp");

const axios = require("axios");

exports.verifyMobile = async (req, res, next) => {
  try {
    let data = req.body;
    User.findOne({ phone: data.phone })
      .populate("role")
      .exec(async (err, userinfo) => {
        if (err) {
          return res.status(400).send(err);
        }
        if (userinfo) {
          return res
            .status(409)
            .send(
              Object.assign(
                { message: "User Already Exists." },
                { status: "false" },
              ),
            );
        }
        if (!userinfo) {
          const otpNumber = sendMessage.generateOTP();
          let insertotp = {
            phone: req.body.phone,
            otp: otpNumber,
          };

          Usersotps.findOne({ phone: req.body.phone }, async (err, otpData) => {
            if (err) {
              return res.status(400).send(err);
            }

            if (otpData) {
              await Usersotps.updateOne(
                {
                  phone: req.body.phone,
                },
                { otp: insertotp.otp },
                async (err, userOTP) => {
                  if (err) {
                    return res.status(400).send(err);
                  }
                  let sendotp = await SendOTP(insertotp);
                  if (sendotp.status) {
                    res
                      .status(200)
                      .send(
                        Object.assign(
                          { message: "OTP Sent Successfully." },
                          { status: true },
                        ),
                      );
                  } else {
                    res
                      .status(401)
                      .send(
                        Object.assign(
                          { message: "Issue in send otp." },
                          { status: false },
                        ),
                      );
                  }
                },
              );
            }
            if (!otpData) {
              await Usersotps.create(insertotp, async (err, userOTP) => {
                if (err) {
                  return res.status(400).send(err);
                }
                if (userOTP) {
                  let sendotp = await SendOTP(userOTP);
                  if (sendotp.status) {
                    res
                      .status(200)
                      .send(
                        Object.assign(
                          { message: "OTP Sent Successfully." },
                          { status: true },
                        ),
                      );
                  } else {
                    res
                      .status(401)
                      .send(
                        Object.assign(
                          { message: "Issue in send otp." },
                          { status: false },
                        ),
                      );
                  }
                }
              });
            }
          });
        }
      });
  } catch (error) {
    res
      .status(500)
      .send(
        Object.assign({ message: "Failed to get OTP.." }, { status: false }),
      );
  }
};
const SendOTP = (userdata) => {
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
            phNo: userdata.phone,
            text: `${userdata.otp} is the OTP For Logging into your Pareek samaj account.Keep the OTP safe. We will never call to ask for your OTP.-Pareek samaj`,
            senderID: config.otpNotification.senderID,
            templateId: config.otpNotification.templateId,
          };

          const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${response.data.TxnOutcome}`,
          };
          axios
            .post(SMS_URL, body, {
              headers: headers,
            })
            .then(function (response) {
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

exports.verifyOtp = async (req, res, next) => {
  try {
    Usersotps.findOne(
      { phone: req.body.phone, otp: req.body.otp },
      (err, otpData) => {
        if (err) {
          return res.status(400).send(err);
        }
        if (otpData) {
          return res
            .status(200)
            .send(
              Object.assign(
                { message: "OTP Verified Successfully." },
                { status: true },
              ),
            );
        }
        if (!otpData) {
          return res
            .status(403)
            .send(
              Object.assign({ message: "Invalid OTP." }, { status: "false" }),
            );
        }
      },
    );
  } catch (error) {
    res.status(500);
    res.json({ message: "Failed to verify OTP." });
  }
};
