import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

// Native .env file reader without external dotenv dependency
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...rest] = trimmed.split('=');
          if (key && rest.length > 0) {
            process.env[key.trim()] = rest.join('=').trim();
          }
        }
      });
    }
  } catch (e) {
    // ignore
  }
}

loadEnv();

// Replace `re_xxxxxxxxx` with your real API key or define RESEND_API_KEY in .env
const apiKey = process.env.RESEND_API_KEY || 're_xxxxxxxxx';
if (apiKey === 're_xxxxxxxxx') {
  console.error('Error: Please replace re_xxxxxxxxx with your real API key or define RESEND_API_KEY in .env.');
  process.exit(1);
}
const resend = new Resend(apiKey);

async function main() {
  console.log('Sending test email via Resend to kriskamau25@gmail.com...');

  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'kriskamau25@gmail.com',
      subject: 'Hello from Muncheez via Resend',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px 24px; color: #1a1a1a; max-width: 540px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #2563EB; font-weight: 600; margin-top: 0;">Muncheez &bull; Resend Integration Verified</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #444;">
            Congrats on sending your <strong>first email</strong> via the Resend API!
          </p>
          <p style="font-size: 14px; color: #666; background: #f8fafc; padding: 12px 16px; border-radius: 6px;">
            <strong>API Key:</strong> <code>${apiKey.substring(0, 10)}...</code><br>
            <strong>Target:</strong> <code>kriskamau25@gmail.com</code><br>
            <strong>Status:</strong> Active &bull; ${new Date().toLocaleString()}
          </p>
          <p style="font-size: 13px; color: #888; margin-bottom: 0;">
            Next step: Add the DNS records for <code>muncheez.co.ke</code> to send from your branded domain.
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Failed to send email:', error);
      process.exit(1);
    }

    console.log('Test email sent successfully! Message ID:', data.id);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

main();
