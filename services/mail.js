const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");

// Create reusable transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Send OTP email (legacy function)
function sendEmail(req, user, callback) {
  ejs.renderFile(
    path.join(__dirname, "ejs/sendOtp.ejs"),
    { name: user.name, verificationLink: "https://google.com" },
    function (err, data) {
      if (err) {
        console.log(err);
        return callback(err);
      } else {
        const mailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: user.email,
          subject: "Hi " + user.name + ", Welcome greeting from Pareek Samaj",
          text: "Hello " + user.name,
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

// Send staff invitation email with credentials
function sendStaffInviteEmail(staffData) {
  return new Promise((resolve, reject) => {
    const { first_name, last_name, email, tempPassword, role } = staffData;
    const fullName = `${first_name} ${last_name}`;

    ejs.renderFile(
      path.join(__dirname, "ejs/staffInvite.ejs"),
      {
        name: fullName,
        email: email,
        tempPassword: tempPassword,
        role: role,
        loginUrl: "http://15.207.87.131/admin/login"
      },
      function (err, html) {
        if (err) {
          console.log("[sendStaffInviteEmail] Template error:", err);
          return reject(err);
        }

        const mailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: `Welcome to Pareek Samaj - Your Account Has Been Created`,
          text: `Hello ${fullName},\n\nYou have been invited to join Pareek Samaj as ${role}.\n\nYour login credentials:\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease login at: http://15.207.87.131/admin/login\n\nPlease change your password after first login.\n\nRegards,\nPareek Samaj Team`,
          html: html,
        };

        transporter.sendMail(mailOptions, function (error, response) {
          if (error) {
            console.log("[sendStaffInviteEmail] Error:", error);
            return reject(error);
          }
          console.log("[sendStaffInviteEmail] Email sent to:", email);
          return resolve(response);
        });
      }
    );
  });
}

module.exports = {
  sendEmail,
  sendStaffInviteEmail
};
