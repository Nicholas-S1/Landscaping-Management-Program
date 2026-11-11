// Real Twilio account ids start with "AC"; anything else (blank, or a placeholder from .env.example) means not set up.
const isSmsConfigured = () =>
  /^AC/.test(process.env.TWILIO_ACCOUNT_SID || '') &&
  Boolean(process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);

// Sends one text per recipient and reports how many went through; never throws for a single bad number.
const sendBulkSms = async (recipients, body) => {
  if (!isSmsConfigured()) return { configured: false, sent: 0, failed: 0, skipped: recipients.length };

  const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const withPhone = recipients.filter((recipient) => recipient.phone);
  const results = await Promise.allSettled(
    withPhone.map((recipient) =>
      client.messages.create({ body, from: process.env.TWILIO_PHONE_NUMBER, to: recipient.phone })
    )
  );
  const sent = results.filter((result) => result.status === 'fulfilled').length;
  return { configured: true, sent, failed: results.length - sent, skipped: recipients.length - withPhone.length };
};

module.exports = { isSmsConfigured, sendBulkSms };
