// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

/**
 * Cognito auth helpers for the step-up authentication demo.
 *
 * Architecture note on clientMetadata:
 *   AWS Cognito does NOT pass ClientMetadata from InitiateAuth to
 *   DefineAuthChallenge or CreateAuthChallenge Lambda triggers.
 *   It only passes ClientMetadata to VerifyAuthChallenge (from RespondToAuthChallenge)
 *   and to PreTokenGeneration.
 *
 *   Therefore:
 *   - The booking-amount threshold check is done HERE in the application layer.
 *   - The app calls CUSTOM_AUTH only when step-up is needed.
 *   - bookingAmount is passed via RespondToAuthChallenge clientMetadata
 *     so PreTokenGeneration can embed it in the token claim.
 */

const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const BOOKING_THRESHOLD = parseFloat(process.env.BOOKING_THRESHOLD || '5000');

/**
 * Signs in a user with username and password (USER_PASSWORD_AUTH).
 *
 * NOTE: USER_PASSWORD_AUTH is for demo only. Production must use USER_SRP_AUTH.
 * See DECISIONS.md ADR-005 and SECURITY_COMPLIANCE.md Risk SC-R2.
 *
 * @returns {{ accessToken, idToken, refreshToken }}
 */
async function signIn(username, password, clientId) {
  const response = await client.send(new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: { USERNAME: username, PASSWORD: password },
  }));

  if (response.AuthenticationResult) {
    return extractTokens(response.AuthenticationResult);
  }
  throw new Error(`Unexpected sign-in challenge: ${response.ChallengeName}`);
}

/**
 * Initiates step-up authentication via CUSTOM_AUTH.
 *
 * The app performs the threshold check here. If bookingAmount is below
 * the threshold, CUSTOM_AUTH is not called — no step-up is needed.
 *
 * @returns {{ requiresStepUp, session, challengeParameters, tokens }}
 */
async function initiateStepUp(username, bookingAmount, clientId) {
  // Application-layer threshold check (Cognito Lambda cannot receive this via InitiateAuth)
  if (bookingAmount <= BOOKING_THRESHOLD) {
    return { requiresStepUp: false, session: null, challengeParameters: null, tokens: null };
  }

  const response = await client.send(new InitiateAuthCommand({
    AuthFlow: 'CUSTOM_AUTH',
    ClientId: clientId,
    AuthParameters: { USERNAME: username },
    // Note: ClientMetadata here does NOT reach Lambda triggers (Cognito service limitation).
    // bookingAmount is passed in RespondToAuthChallenge instead.
  }));

  if (response.ChallengeName === 'CUSTOM_CHALLENGE') {
    return {
      requiresStepUp: true,
      session: response.Session,
      challengeParameters: response.ChallengeParameters,
      tokens: null,
    };
  }

  throw new Error(`Unexpected response from InitiateAuth: ${response.ChallengeName || 'unknown'}`);
}

/**
 * Responds to the CUSTOM_CHALLENGE with the user-provided OTP.
 *
 * Passes bookingAmount via clientMetadata here — this DOES reach VerifyAuthChallenge
 * and PreTokenGeneration (clientMetadata from RespondToAuthChallenge is forwarded).
 *
 * @returns {{ tokens } | { session, challengeParameters, requiresRetry }}
 */
async function respondToStepUpChallenge(username, session, otp, bookingAmount, clientId) {
  const response = await client.send(new RespondToAuthChallengeCommand({
    ChallengeName: 'CUSTOM_CHALLENGE',
    ClientId: clientId,
    Session: session,
    ChallengeResponses: { USERNAME: username, ANSWER: otp },
    // clientMetadata here DOES reach Lambda triggers
    ClientMetadata: {
      bookingAmount: String(bookingAmount),
      stepUp: 'true',
    },
  }));

  if (response.AuthenticationResult) {
    return { tokens: extractTokens(response.AuthenticationResult), requiresRetry: false };
  }

  if (response.ChallengeName === 'CUSTOM_CHALLENGE') {
    return {
      tokens: null,
      requiresRetry: true,
      session: response.Session,
      challengeParameters: response.ChallengeParameters,
    };
  }

  throw new Error(`Unexpected challenge response: ${response.ChallengeName}`);
}

/**
 * Decodes a JWT payload without verifying the signature.
 * For display purposes in the demo only — always verify in production.
 */
function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}

function extractTokens(result) {
  return {
    accessToken: result.AccessToken,
    idToken: result.IdToken,
    refreshToken: result.RefreshToken,
  };
}

module.exports = { signIn, initiateStepUp, respondToStepUpChallenge, decodeJwtPayload };
