// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

/**
 * End-to-end demo of Cognito step-up authentication for high-value bookings.
 *
 * Run: node src/demo.js
 *
 * Flow:
 *   1. Sign in with username/password (USER_PASSWORD_AUTH)
 *   2. Simulate a booking that exceeds the threshold
 *   3. Initiate CUSTOM_AUTH step-up challenge
 *   4. Prompt for the OTP (check email or CloudWatch Logs if OTP_DELIVERY_MODE=console)
 *   5. Submit OTP and receive step-up tokens
 *   6. Decode and display JWT claims — verify step_up claim is present
 */

require('dotenv').config();
const readline = require('readline');
const { signIn, initiateStepUp, respondToStepUpChallenge, decodeJwtPayload } = require('./auth');

const CLIENT_ID = process.env.CLIENT_ID;
const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;
const BOOKING_AMOUNT = parseFloat(process.env.BOOKING_AMOUNT || '8000');

function line(char = '─', len = 60) {
  return char.repeat(len);
}

function step(n, label) {
  console.log(`\n${line()}`);
  console.log(`  STEP ${n}: ${label}`);
  console.log(line());
}

function result(label, value) {
  const v = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  console.log(`  ${label}:`);
  v.split('\n').forEach((l) => console.log(`    ${l}`));
}

async function promptOtp() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('\n  Enter the OTP from your email (or CloudWatch Logs): ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  if (!CLIENT_ID || !EMAIL || !PASSWORD) {
    console.error('Missing required env vars. Copy .env.example → .env and fill in values.');
    process.exit(1);
  }

  console.log('\n' + line('═'));
  console.log('  Cognito Step-Up Auth Demo');
  console.log('  Booking amount: $' + BOOKING_AMOUNT.toLocaleString());
  console.log(line('═'));

  // ─── Step 1: Regular sign-in ───────────────────────────────────────────────
  step(1, 'Sign in (initial authentication)');
  console.log(`  User: ${EMAIL}`);

  const t0 = Date.now();
  const initialTokens = await signIn(EMAIL, PASSWORD, CLIENT_ID);
  console.log(`  Sign-in succeeded in ${Date.now() - t0}ms`);

  const initialClaims = decodeJwtPayload(initialTokens.idToken);
  result('ID token claims (initial)', {
    sub: initialClaims.sub,
    email: initialClaims.email,
    'token_use': initialClaims.token_use,
    exp: new Date(initialClaims.exp * 1000).toISOString(),
    step_up: initialClaims.step_up || '(not present)',
  });

  // ─── Step 2: Booking check ─────────────────────────────────────────────────
  step(2, 'Application checks booking amount');
  console.log(`  Booking amount : $${BOOKING_AMOUNT.toLocaleString()}`);
  console.log(`  Threshold      : $5,000 (set via CDK BOOKING_THRESHOLD)`);

  if (BOOKING_AMOUNT <= 5000) {
    console.log('\n  Booking is BELOW threshold — no step-up required.');
    console.log('  (Set BOOKING_AMOUNT > 5000 in .env to see the step-up flow.)');
  } else {
    console.log('\n  Booking EXCEEDS threshold — step-up authentication required.');
  }

  // ─── Step 3: Initiate step-up ──────────────────────────────────────────────
  step(3, 'Initiate CUSTOM_AUTH step-up challenge');
  console.log(`  Calling InitiateAuth with CUSTOM_AUTH flow...`);
  console.log(`  clientMetadata: { bookingAmount: "${BOOKING_AMOUNT}", stepUp: "true" }`);

  const t1 = Date.now();
  const stepUpResult = await initiateStepUp(EMAIL, BOOKING_AMOUNT, CLIENT_ID);
  console.log(`  Response received in ${Date.now() - t1}ms`);

  if (!stepUpResult.requiresStepUp) {
    // Booking was below threshold — DefineAuthChallenge issued tokens directly
    step(4, 'No challenge required (booking below threshold)');
    displayFinalTokens(stepUpResult.tokens);
    return;
  }

  result('Challenge parameters (public)', stepUpResult.challengeParameters);
  console.log('\n  OTP has been sent. Check your email or CloudWatch Logs.');

  // ─── Step 4: Collect OTP ───────────────────────────────────────────────────
  step(4, 'Collect OTP from user');
  const otp = await promptOtp();

  if (!otp) {
    console.error('  No OTP provided. Exiting.');
    process.exit(1);
  }

  // ─── Step 5: Respond to challenge ─────────────────────────────────────────
  step(5, 'Respond to CUSTOM_CHALLENGE with OTP');
  console.log(`  Calling RespondToAuthChallenge...`);

  const t2 = Date.now();
  let challengeResponse = await respondToStepUpChallenge(
    EMAIL,
    stepUpResult.session,
    otp,
    BOOKING_AMOUNT,
    CLIENT_ID
  );
  console.log(`  Response received in ${Date.now() - t2}ms`);

  // Handle retry (wrong OTP, attempts remaining)
  let attempt = 1;
  while (challengeResponse.requiresRetry && attempt < 3) {
    attempt++;
    console.log(`\n  Incorrect OTP. Please try again (attempt ${attempt}/3).`);
    const retryOtp = await promptOtp();
    challengeResponse = await respondToStepUpChallenge(
      EMAIL,
      challengeResponse.session,
      retryOtp,
      BOOKING_AMOUNT,
      CLIENT_ID
    );
  }

  if (!challengeResponse.tokens) {
    console.error('\n  Authentication failed after maximum attempts.');
    process.exit(1);
  }

  // ─── Step 6: Display step-up tokens ───────────────────────────────────────
  step(6, 'Step-up complete — display token claims');
  displayFinalTokens(challengeResponse.tokens);
}

function displayFinalTokens(tokens) {
  const claims = decodeJwtPayload(tokens.idToken);

  console.log('\n  Step-up authentication SUCCEEDED.');
  result('ID token claims (step-up)', {
    sub: claims.sub,
    email: claims.email,
    'token_use': claims.token_use,
    exp: new Date(claims.exp * 1000).toISOString(),
    step_up: claims.step_up || '(not present)',
    step_up_at: claims.step_up_at
      ? new Date(parseInt(claims.step_up_at) * 1000).toISOString()
      : '(not present)',
    step_up_booking_amount: claims.step_up_booking_amount || '(not present)',
  });

  if (claims.step_up === 'true') {
    console.log('\n  ✓ step_up claim is present in the token.');
    console.log('  Downstream services can verify this claim without calling Cognito.');
  } else {
    console.log('\n  ⚠ step_up claim not found. Check PreTokenGeneration Lambda logs.');
  }

  console.log('\n' + line('═'));
  console.log('  Demo complete.');
  console.log(line('═') + '\n');
}

main().catch((err) => {
  console.error('\nDemo error:', err.message);
  if (err.name === 'NotAuthorizedException') {
    console.error('Check your credentials or run `node src/setup.js` first.');
  }
  if (err.name === 'UserNotFoundException') {
    console.error('User not found. Run `node src/setup.js` to create the test user.');
  }
  process.exit(1);
});
