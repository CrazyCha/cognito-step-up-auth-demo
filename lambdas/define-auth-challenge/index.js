'use strict';

const MAX_ATTEMPTS = parseInt(process.env.MAX_ATTEMPTS || '3', 10);

/**
 * DefineAuthChallenge — session state machine.
 *
 * The booking-amount threshold check is done in the APPLICATION layer (not here).
 * The app calls CUSTOM_AUTH only when step-up is required. This Lambda manages
 * the challenge session state only.
 *
 * States:
 *   session empty            → issue CUSTOM_CHALLENGE (OTP challenge)
 *   last challenge passed    → issue tokens
 *   too many failures        → fail authentication
 *   last challenge failed    → re-issue CUSTOM_CHALLENGE (retry)
 */
exports.handler = async (event) => {
  const { session } = event.request;

  console.log('DefineAuthChallenge', JSON.stringify({
    sessionLength: session.length,
    userName: event.userName,
    lastResult: session.length > 0 ? session[session.length - 1].challengeResult : null,
  }));

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
    console.log('Session empty — issuing CUSTOM_CHALLENGE');
    event.response.challengeName = 'CUSTOM_CHALLENGE';
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    return event;
  }

  const lastChallenge = session[session.length - 1];

  if (lastChallenge.challengeName === 'CUSTOM_CHALLENGE' && lastChallenge.challengeResult === true) {
    console.log('Challenge passed — issuing tokens');
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
    return event;
  }

  console.log(`Challenge failed (failures: ${failedAttempts}) — re-issuing challenge`);
  event.response.challengeName = 'CUSTOM_CHALLENGE';
  event.response.issueTokens = false;
  event.response.failAuthentication = false;
  return event;
};
