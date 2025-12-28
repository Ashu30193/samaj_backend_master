const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");

// Log SMTP configuration (without password)
console.log("[Mail Service] Initializing with config:", {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  user: process.env.MAIL_USER,
  hasPassword: !!process.env.MAIL_PASS
});

// Create reusable transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter connection
transporter.verify(function (error, success) {
  if (error) {
    console.log("[Mail Service] SMTP connection error:", error.message);
  } else {
    console.log("[Mail Service] SMTP server is ready to send emails");
  }
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
          from: process.env.SMTP_FROM || process.env.MAIL_USER,
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
    console.log("[sendStaffInviteEmail] Starting email send process...");
    console.log("[sendStaffInviteEmail] Staff data received:", {
      first_name: staffData.first_name,
      last_name: staffData.last_name,
      email: staffData.email,
      role: staffData.role,
      hasPassword: !!staffData.tempPassword
    });

    const { first_name, last_name, email, tempPassword, role } = staffData;
    const fullName = `${first_name} ${last_name}`;

    const templatePath = path.join(__dirname, "ejs/staffInvite.ejs");
    console.log("[sendStaffInviteEmail] Template path:", templatePath);

    ejs.renderFile(
      templatePath,
      {
        name: fullName,
        email: email,
        tempPassword: tempPassword,
        role: role,
        loginUrl: "http://15.207.87.131/admin/login"
      },
      function (err, html) {
        if (err) {
          console.log("[sendStaffInviteEmail] Template render error:", err.message);
          console.log("[sendStaffInviteEmail] Full error:", err);
          return reject(err);
        }

        console.log("[sendStaffInviteEmail] Template rendered successfully, length:", html.length);

        const mailOptions = {
          from: process.env.SMTP_FROM || process.env.MAIL_USER,
          to: email,
          subject: `Welcome to Pareek Samaj - Your Account Has Been Created`,
          text: `Hello ${fullName},\n\nYou have been invited to join Pareek Samaj as ${role}.\n\nYour login credentials:\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease login at: http://15.207.87.131/admin/login\n\nPlease change your password after first login.\n\nRegards,\nPareek Samaj Team`,
          html: html,
        };

        console.log("[sendStaffInviteEmail] Mail options:", {
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject
        });

        console.log("[sendStaffInviteEmail] Calling transporter.sendMail...");

        transporter.sendMail(mailOptions, function (error, response) {
          if (error) {
            console.log("[sendStaffInviteEmail] SendMail Error:", error.message);
            console.log("[sendStaffInviteEmail] Full error object:", JSON.stringify(error, null, 2));
            return reject(error);
          }
          console.log("[sendStaffInviteEmail] SUCCESS! Email sent to:", email);
          console.log("[sendStaffInviteEmail] Response:", JSON.stringify(response, null, 2));
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
