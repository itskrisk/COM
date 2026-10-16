const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Initialize Resend client using environment variable with fallback
// Replace `re_xxxxxxxxx` with your real API key in .env
const apiKey = process.env.RESEND_API_KEY || 're_xxxxxxxxx';
const resend = new Resend(apiKey);

// Default sender — uses onboarding domain until custom domain verification completes
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'Muncheez <onboarding@resend.dev>';
const PRODUCTION_FROM = 'Muncheez <noreply@muncheez.co.ke>';

/**
 * Send an email via Resend API
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} [options.html] - HTML body
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.from] - Sender address
 */
async function sendEmail({ to, subject, html, text, from = DEFAULT_FROM }) {
  try {
    const recipients = Array.isArray(to) ? to : [to];
    const data = await resend.emails.send({
      from,
      to: recipients,
      subject,
      html,
      text,
    });
    return { success: true, data };
  } catch (error) {
    console.error('[Resend Email Service] Error sending email:', error);
    return { success: false, error: error.message || error };
  }
}

/**
 * Send a template email from the emailtemp folder
 * @param {string} templateFileName - e.g. 'welcome.html' or 'confirm_signup.html'
 * @param {Object} options
 * @param {string|string[]} options.to
 * @param {string} options.subject
 * @param {Object} [options.variables] - Map of {{ key }} replacements
 * @param {string} [options.from]
 */
async function sendTemplateEmail(templateFileName, { to, subject, variables = {}, from }) {
  try {
    const templatePath = path.resolve(__dirname, '../../../../emailtemp', templateFileName);
    let html = fs.readFileSync(templatePath, 'utf8');

    // Replace template variables like {{ .ConfirmationURL }} or {{ name }}
    Object.entries(variables).forEach(([key, val]) => {
      const regex = new RegExp(`\\{\\{\\s*\\.?${key}\\s*\\}\\}`, 'g');
      html = html.replace(regex, val);
    });

    return await sendEmail({ to, subject, html, from });
  } catch (error) {
    console.error(`[Resend Email Service] Failed to send template ${templateFileName}:`, error);
    return { success: false, error: error.message || error };
  }
}

module.exports = {
  resend,
  sendEmail,
  sendTemplateEmail,
  DEFAULT_FROM,
  PRODUCTION_FROM,
};
