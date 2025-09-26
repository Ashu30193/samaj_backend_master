const fs = require("fs");
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");
const ses = require("nodemailer-ses-transport");
const config = require("../config.json");

function sendEmail(req, user, callback) {
  // const host = req.get("host");
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: false,
    auth: {
      user: "morvaymarketing@gmail.com",
      pass: "MM123456mm",
    },
    // secure: true,
    // tls: {
    //   // do not fail on invalid certs
    //   rejectUnauthorized: false,
    // },
    // ses({
    //   accessKeyId: config.aws.accessKeyId,
    //   secretAccessKey: config.aws.secretAccessKey,
    // }),
  });

  ejs.renderFile(
    path.join(__dirname, "ejs/sendOtp.ejs"),
    { name: user.name, verificationLink: "" },
    function (err, data) {
      if (err) {
        console.log(err);
        return callback(err);
      } else {
        const defaultMails = [];
        // defaultMails.push(user.email);
        const mailOptions = {
          from: "morvaymarketing@gmail.com", // sender address
          to: "morvaymarketing@gmail.com", // list of receivers
          subject: "Hi " + user.name + ", Welcome greeting from BookTranspo", // Subject line
          text: "Hello " + user.name, // plain text body
          html: data,
        };
        transporter.sendMail(mailOptions, function (error, response) {
          if (error) {
            console.log("invitation email Error", error);
            return callback(error);
          }
          console.log("invitation SENT", response);
          return callback(null, response);
        });
      }
    },
  );
}

module.exports.sendEmail = sendEmail;
