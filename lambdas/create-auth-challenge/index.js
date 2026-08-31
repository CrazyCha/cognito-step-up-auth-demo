'use strict';

const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const crypto = require('crypto');

const ddb = new DynamoDBClient({});
const ses = new SESClient({});

const OTP_TABLE = process.env.OTP_TABLE_NAME;
const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10);
const DELIVERY_MODE = process.env.OTP_DELIVERY_MODE || 'email';
const FROM_EMAIL = process.env.FROM_EMAIL || '';

/**
 * CreateAuthChallenge — generates an OTP, persists it, and delivers it to the user.
 *
 * Delivery modes:
 *   'email'   — sends via SES (production path)
 *   'console' — logs the OTP to CloudWatch Logs (demo/dev only; see SECURITY_COMPLIANCE.md Risk SC-R6)
 *
 * Stores only an opaque otpId in privateChallengeParameters (not the OTP itself).
 * See DECISIONS.md ADR-003.
 */
exports.handler = async (event) => {
  const { userAttributes } = event.request;
  const email = userAttributes.email;

  const otp = generateOtp();
  const otpId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + OTP_EXPIRY;

  console.log('CreateAuthChallenge', JSON.stringify({
    userName: event.userName,
    otpId,
    expiresAt,
    deliveryMode: DELIVERY_MODE,
  }));

  // Persist OTP in DynamoDB with TTL
  await ddb.send(new PutItemCommand({
    TableName: OTP_TABLE,
    Item: {
      otpId: { S: otpId },
      otp: { S: otp },
      userId: { S: event.userName },
      expiresAt: { N: expiresAt.toString() },
      createdAt: { N: now.toString() },
    },
    // Prevent overwrite — each challenge gets a fresh record
    ConditionExpression: 'attribute_not_exists(otpId)',
  }));

  await deliverOtp(otp, email, OTP_EXPIRY);

  // Return opaque reference — the OTP value never leaves this Lambda
  event.response.publicChallengeParameters = {
    email: maskEmail(email),
    expiryMinutes: Math.ceil(OTP_EXPIRY / 60).toString(),
  };
  event.response.privateChallengeParameters = {
    otpId,
  };
  event.response.challengeMetadata = `OTP_CHALLENGE:${otpId}`;

  return event;
};

async function deliverOtp(otp, email, expirySeconds) {
  const expiryMinutes = Math.ceil(expirySeconds / 60);

  if (DELIVERY_MODE === 'console') {
    // WARNING: logging OTPs is only acceptable for local demo/dev environments.
    // This path MUST NOT be used with real users. See SECURITY_COMPLIANCE.md Risk SC-R6.
    console.warn(`[DEMO ONLY] OTP for ${email}: ${otp} (expires in ${expiryMinutes} min)`);
    return;
  }

  await ses.send(new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: {
        Data: 'Verification required for your booking',
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: [
            `Your one-time verification code is: ${otp}`,
            '',
            `This code is valid for ${expiryMinutes} minutes.`,
            '',
            'This additional verification is required because your booking exceeds our',
            'security threshold. If you did not initiate this booking, please contact',
            'support immediately.',
          ].join('\n'),
          Charset: 'UTF-8',
        },
      },
    },
  }));
}

function generateOtp() {
  // crypto.randomInt produces a cryptographically strong random integer
  return String(crypto.randomInt(100000, 1000000));
}

function maskEmail(email) {
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}${'*'.repeat(user.length - 2)}${user[user.length - 1]}@${domain}`;
}
