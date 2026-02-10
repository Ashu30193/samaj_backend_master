const sendMessage = require("../services/send-message");
const smsService = require("../services/api");
const User = require("../models/user");
const Usersotps = require("../models/otp");

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
                  let sendotp = await smsService.sendOTP(insertotp.phone, insertotp.otp);
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
                  let sendotp = await smsService.sendOTP(userOTP.phone, userOTP.otp);
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
