const fs = require("fs");
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");
const ses = require("nodemailer-ses-transport");

function sendEmail(req, user, callback) {
  // const host = req.get("host");
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "pareeksamaj1@gmail.com",
      pass: "bvvk xkaf xroa fcey",
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
    { name: user.name, verificationLink: "https://google.com" },
    function (err, data) {
      if (err) {
        console.log(err);
        return callback(err);
      } else {
        const defaultMails = [];
        // defaultMails.push(user.email);
        const mailOptions = {
          from: "pareeksamaj1@gmail.com",
          to: "abhishek.s.chauhan2002@gmail.com", // sender address
          // to: "morvaymarketing@gmail.com", // list of receivers
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

// module.exports.sendEmail = sendEmail;

sendEmail(
  {},
  {
    name: "Sandeep Negi",
    email: "abhishek.s.chauhan2002@gmail.com"
  },
  (err, res) => {
    if (err) {
      console.log("Error in sending email:", err);
    } else {
      console.log("Email sent successfully:", res);
    }
  }
);
