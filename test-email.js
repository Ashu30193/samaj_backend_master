const fs = require("fs");
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");

async function testEmail() {
  console.log("Starting email test...");

  // Create transporter with Gmail SMTP
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "morvaymarketing@gmail.com",
      pass: "MM123456mm",
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Verify transporter configuration
  try {
    await transporter.verify();
    console.log("✓ Server connection verified");
  } catch (error) {
    console.error("✗ Server connection failed:", error.message);
    return;
  }

  // Render email template
  const templatePath = path.join(__dirname, "services/ejs/sendOtp.ejs");

  ejs.renderFile(
    templatePath,
    {
      name: "Abhishek",
      verificationLink: "https://example.com/verify"
    },
    async function (err, htmlContent) {
      if (err) {
        console.error("✗ Template rendering failed:", err);
        return;
      }

      console.log("✓ Email template rendered successfully");

      // Email options
      const mailOptions = {
        from: '"Samaj Test" <morvaymarketing@gmail.com>',
        to: "abhishek.s.chauhan2002@gmail.com",
        subject: "Test Email from Samaj Backend",
        text: "Hello Abhishek, this is a test email from the Samaj backend system.",
        html: htmlContent
      };

      // Send email
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log("✓ Email sent successfully!");
        console.log("  Message ID:", info.messageId);
        console.log("  Response:", info.response);
      } catch (error) {
        console.error("✗ Failed to send email:", error.message);
        if (error.responseCode) {
          console.error("  Response code:", error.responseCode);
        }
        if (error.command) {
          console.error("  Command:", error.command);
        }
      }
    }
  );
}

// Run the test
testEmail().catch(console.error);