'use strict';

const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Signs in a user with username and password (USER_PASSWORD_AUTH).
 *
 * NOTE: USER_PASSWORD_AUTH is enabled on the demo app client for simplicity.
 * Production apps must use USER_SRP_AUTH. See DECISIONS.md ADR-005.
 *
 * @returns {{ accessToken, idToken, refreshToken }}
 */
async function signIn(username, password, clientId) {
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });

  const response = await client.send(command);

  if (response.AuthenticationResult) {
    return {
      accessToken: response.AuthenticationResult.AccessToken,
      idToken: response.AuthenticationResult.IdToken,
      refreshToken: response.AuthenticationResult.RefreshToken,
    };
  }

  throw new Error(`Unexpected sign-in response: ${response.ChallengeName}`);
}

/**
 * Initiates a CUSTOM_AUTH session for step-up authentication.
 *
 * Passes bookingAmount via clientMetadata so DefineAuthChallenge can decide
 * whether step-up is required.
 *
 * @returns {{ session, challengeParameters, requiresStepUp }}
 */
async function initiateStepUp(username, bookingAmount, clientId) {
  const command = new InitiateAuthCommand({
    AuthFlow: 'CUSTOM_AUTH',
    ClientId: clientId,
    AuthParameters: {
      USERNAME: username,
    },
    ClientMetadata: {
      bookingAmount: String(bookingAmount),
      stepUp: 'true',
    },
  });

  const response = await client.send(command);

  if (response.AuthenticationResult) {
    // bookingAmount was below threshold — tokens issued directly
    return {
      session: null,
      challengeParameters: null,
      tokens: {
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        refreshToken: response.AuthenticationResult.RefreshToken,
      },
      requiresStepUp: false,
    };
  }

  if (response.ChallengeName === 'CUSTOM_CHALLENGE') {
    return {
      session: response.Session,
      challengeParameters: response.ChallengeParameters,
      tokens: null,
      requiresStepUp: true,
    };
  }

  throw new Error(`Unexpected challenge: ${response.ChallengeName}`);
}

/**
 * Responds to the CUSTOM_CHALLENGE with the user-provided OTP.
 *
 * Passes stepUp=true in clientMetadata so PreTokenGeneration injects
 * the step_up claim into the resulting tokens.
 *
 * @returns {{ accessToken, idToken, refreshToken }}
 */
async function respondToStepUpChallenge(username, session, otp, bookingAmount, clientId) {
  const command = new RespondToAuthChallengeCommand({
    ChallengeName: 'CUSTOM_CHALLENGE',
    ClientId: clientId,
    Session: session,
    ChallengeResponses: {
      USERNAME: username,
      ANSWER: otp,
    },
    ClientMetadata: {
      bookingAmount: String(bookingAmount),
      stepUp: 'true',
    },
  });

  const response = await client.send(command);

  if (response.AuthenticationResult) {
    return {
      accessToken: response.AuthenticationResult.AccessToken,
      idToken: response.AuthenticationResult.IdToken,
      refreshToken: response.AuthenticationResult.RefreshToken,
    };
  }

  if (response.ChallengeName === 'CUSTOM_CHALLENGE') {
    // Wrong OTP — another attempt allowed
    return {
      session: response.Session,
      challengeParameters: response.ChallengeParameters,
      tokens: null,
      requiresRetry: true,
    };
  }

  throw new Error(`Unexpected response after challenge: ${response.ChallengeName}`);
}

/**
 * Decodes a JWT payload without verifying the signature.
 * For display purposes only — always verify signatures in production.
 */
function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payload);
}

module.exports = { signIn, initiateStepUp, respondToStepUpChallenge, decodeJwtPayload };
