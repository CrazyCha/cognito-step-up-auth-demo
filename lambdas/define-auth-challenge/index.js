'use strict';

const BOOKING_THRESHOLD = parseFloat(process.env.BOOKING_THRESHOLD || '5000');
const MAX_ATTEMPTS = parseInt(process.env.MAX_ATTEMPTS || '3', 10);

/**
 * DefineAuthChallenge — state machine for the step-up auth flow.
 *
 * Flow states:
 *   1. No session yet + bookingAmount > threshold  → issue CUSTOM_CHALLENGE
 *   2. No session yet + bookingAmount <= threshold → issue tokens immediately (no step-up needed)
 *   3. Last challenge passed                       → issue tokens
 *   4. Too many failed attempts                    → fail authentication
 *   5. Last challenge failed, retries remain       → re-issue CUSTOM_CHALLENGE
 */
exports.handler = async (event) => {
  const { session, clientMetadata } = event.request;

  console.log('DefineAuthChallenge', JSON.stringify({
    sessionLength: session.length,
    clientMetadata,
    userName: event.userName,
  }));

  // Count consecutive failures to enforce the retry cap
  const failedAttempts = session.filter(
    (s) => s.challengeName === 'CUSTOM_CHALLENGE' && s.challengeResult === false
  ).length;

  if (failedAttempts >= MAX_ATTEMPTS) {
    console.log(`Max attempts (${MAX_ATTEMPTS}) reached — failing auth`);
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
    return event;
  }

  if (session.length === 0) {
    // First call in this auth session
    const bookingAmount = parseFloat(clientMetadata?.bookingAmount || '0');

    if (bookingAmount > BOOKING_THRESHOLD) {
      console.log(`Booking amount ${bookingAmount} exceeds threshold ${BOOKING_THRESHOLD} — issuing challenge`);
      event.response.challengeName = 'CUSTOM_CHALLENGE';
      event.response.issueTokens = false;
      event.response.failAuthentication = false;
    } else {
      console.log(`Booking amount ${bookingAmount} is below threshold — issuing tokens directly`);
      event.response.issueTokens = true;
      event.response.failAuthentication = false;
    }
    return event;
  }

  const lastChallenge = session[session.length - 1];

  if (lastChallenge.challengeName === 'CUSTOM_CHALLENGE' && lastChallenge.challengeResult === true) {
    console.log('OTP verified successfully — issuing step-up tokens');
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
    return event;
  }

  // Challenge failed, retries remain
  console.log(`OTP failed (attempt ${failedAttempts + 1}/${MAX_ATTEMPTS}) — re-issuing challenge`);
  event.response.challengeName = 'CUSTOM_CHALLENGE';
  event.response.issueTokens = false;
  event.response.failAuthentication = false;
  return event;
};
