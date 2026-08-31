'use strict';

/**
 * One-time setup script: creates a test user in the Cognito User Pool
 * using the admin API (bypasses the sign-up / email verification flow).
 *
 * Run: node src/setup.js
 * Requires: AWS credentials with cognito-idp:AdminCreateUser and cognito-idp:AdminSetUserPassword
 */

require('dotenv').config();

const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const USER_POOL_ID = process.env.USER_POOL_ID;
const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;

async function main() {
  if (!USER_POOL_ID || !EMAIL || !PASSWORD) {
    console.error('Missing required environment variables: USER_POOL_ID, TEST_USER_EMAIL, TEST_USER_PASSWORD');
    console.error('Copy app/.env.example to app/.env and fill in the values.');
    process.exit(1);
  }

  console.log(`\n=== Step-Up Auth Demo Setup ===`);
  console.log(`User Pool : ${USER_POOL_ID}`);
  console.log(`Email     : ${EMAIL}`);

  // Check if user already exists
  try {
    await client.send(new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: EMAIL }));
    console.log(`\nUser ${EMAIL} already exists — skipping creation.`);
    console.log('Setup complete. Run: node src/demo.js');
    return;
  } catch (err) {
    if (err.name !== 'UserNotFoundException') throw err;
  }

  // Create user (suppresses the welcome email sent by Cognito)
  console.log(`\nCreating user ${EMAIL}...`);
  await client.send(new AdminCreateUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: EMAIL,
    UserAttributes: [
      { Name: 'email', Value: EMAIL },
      { Name: 'email_verified', Value: 'true' },
    ],
    MessageAction: 'SUPPRESS',
  }));

  // Set permanent password immediately (skips FORCE_CHANGE_PASSWORD state)
  await client.send(new AdminSetUserPasswordCommand({
    UserPoolId: USER_POOL_ID,
    Username: EMAIL,
    Password: PASSWORD,
    Permanent: true,
  }));

  console.log(`User created and confirmed successfully.`);
  console.log(`\nSetup complete. Run: node src/demo.js`);
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
