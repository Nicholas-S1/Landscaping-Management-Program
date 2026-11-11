const { Op } = require('sequelize');
const { User, Message } = require('../models');
const { wrap, httpError } = require('../utils/crud');
const { sendBulkSms } = require('../services/smsService');

const sendBroadcast = wrap(async (req, res) => {
  const content = (req.body.content || '').trim();
  if (!content) throw httpError(400, 'Message content is required');

  const recipients = await User.findAll({
    where: { role: { [Op.in]: ['employee', 'manager'] }, isActive: true, id: { [Op.ne]: req.user.id } },
    attributes: ['id', 'phone']
  });

  await Message.bulkCreate(
    recipients.map((recipient) => ({
      senderId: req.user.id,
      recipientId: recipient.id,
      subject: req.body.subject || 'Company announcement',
      content
    }))
  );
  const sms = req.body.sendSms === false
    ? { configured: null, sent: 0, failed: 0, skipped: recipients.length }
    : await sendBulkSms(recipients, content);

  res.status(201).json({ success: true, message: 'Announcement sent', data: { recipients: recipients.length, sms } });
});

module.exports = { sendBroadcast };
