const fs = require("fs");
const nodemailer = require("nodemailer");
const ses = require("nodemailer-ses-transport");
const ejs = require("ejs");
const path = require("path");
const config = require("./config.json");

async function testEmailWithSES() {
  console.log("Starting AWS SES email test...");

  // Create transporter with AWS SES
  const transporter = nodemailer.createTransport(
    ses({
      accessKeyId: config.sesKeys.accessKeyId,
      secretAccessKey: config.sesKeys.secretAccessKey,
      region: 'us-east-1' // You may need to adjust this region
    })
  );

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
        from: "pavanvyaspareek@gmail.com", // Using the email from config
        to: "abhishek.s.chauhan2002@gmail.com",
        subject: "Test Email from Samaj Backend (AWS SES)",
        text: "Hello Abhishek, this is a test email from the Samaj backend system using AWS SES.",
        html: htmlContent
      };

      // Send email
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log("✓ Email sent successfully via AWS SES!");
        console.log("  Message ID:", info.messageId);
        console.log("  Response:", info.response);
      } catch (error) {
        console.error("✗ Failed to send email via AWS SES:", error.message);
        console.error("  Full error:", error);
      }
    }
  );
}

// Alternative: Test with Gmail using App Password
async function testEmailWithGmail() {
  console.log("\nTesting with Gmail (requires App Password)...");
  console.log("Note: Gmail requires either:");
  console.log("1. App-specific password (recommended)");
  console.log("2. OAuth2 authentication");
  console.log("3. Less secure app access (deprecated)\n");

  // You would need to update these credentials
  console.log("Current Gmail credentials in mail.js:");
  console.log("- User: morvaymarketing@gmail.com");
  console.log("- Pass: MM123456mm (appears to be invalid/outdated)");
  console.log("\nTo fix Gmail authentication:");
  console.log("1. Enable 2-factor authentication on the Gmail account");
  console.log("2. Generate an App Password at: https://myaccount.google.com/apppasswords");
  console.log("3. Update the password in services/mail.js with the App Password");
}

// Run tests
console.log("=" * 50);
console.log("Email Service Test Report");
console.log("=" * 50);

testEmailWithSES()
  .then(() => testEmailWithGmail())
  .catch(console.error);