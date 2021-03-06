const nodemailer = require('nodemailer');

const user = process.env.SITE_MAIL;
const pass = process.env.MAIL_PASSWORD;

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: 26,
  secure: false, // true for 465, false for other ports
  auth: {user, pass},
  tls: {
    rejectUnauthorized: false
  }
});

const sender = async (to, subject, text) => {
  const from = process.env.SITE_MAIL;
  await transporter.sendMail({
    from, to, subject, text
  });
}

const sendWelcomeMail = async (email, name) => {
  const subject = "Thanks for joining in!";
  const text = `Welcome to the app, ${ name }. let me know how you get along with the app.`;

  sender(email, subject, text);
}

const sendCancellationMail = async (email, name) => {
  const subject = "Sorry to see you go";
  const text = `Goodbye, ${ name }. I hope to see you back sometime soon`;

  sender(email, subject, text);
}

module.exports = {
  sendWelcomeMail,
  sendCancellationMail
}