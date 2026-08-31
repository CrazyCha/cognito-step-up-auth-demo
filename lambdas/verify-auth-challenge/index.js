'use strict';

const { DynamoDBClient, GetItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const crypto = require('crypto');

const ddb = new DynamoDBClient({});
const OTP_TABLE = process.env.OTP_TABLE_NAME;

/**
 * VerifyAuthChallenge — validates the user's OTP answer against the stored record.
 *
 * Security properties:
 *   - Expiry is checked explicitly (DynamoDB TTL is eventual; Lambda check is authoritative)
 *   - Constant-time comparison prevents timing-based OTP enumeration
 *   - Consumed OTPs are deleted immediately (replay prevention)
 *   - Any error (OTP not found, expired, deleted) results in answerCorrect=false
 */
exports.handler = async (event) => {
  const { privateChallengeParameters, challengeAnswer } = event.request;
  const { otpId } = privateChallengeParameters;

  console.log('VerifyAuthChallenge', JSON.stringify({
    userName: event.userName,
    otpId,
    // Do not log the answer
  }));

  event.response.answerCorrect = false; // default to fail

  if (!otpId || !challengeAnswer) {
    console.warn('Missing otpId or challengeAnswer');
    return event;
  }

  let item;
  try {
    const result = await ddb.send(new GetItemCommand({
      TableName: OTP_TABLE,
      Key: { otpId: { S: otpId } },
      ConsistentRead: true,
    }));
    item = result.Item;
  } catch (err) {
    console.error('DynamoDB GetItem error:', err.message);
    return event;
  }

  if (!item) {
    console.warn('OTP record not found (expired or already consumed)');
    return event;
  }

  const storedOtp = item.otp.S;
  const expiresAt = parseInt(item.expiresAt.N, 10);
  const storedUserId = item.userId.S;
  const nowSec = Math.floor(Date.now() / 1000);

  // Bind OTP to the user who initiated the challenge (prevents cross-user OTP reuse)
  if (storedUserId !== event.userName) {
    console.warn('OTP user mismatch');
    return event;
  }

  if (nowSec > expiresAt) {
    console.warn('OTP expired');
    // Clean up expired record proactively (TTL handles this eventually)
    await safeDelete(otpId);
    return event;
  }

  // Constant-time comparison — mitigates timing-based enumeration of valid OTPs
  const answerBuf = Buffer.from(String(challengeAnswer).padEnd(6, '\0'));
  const storedBuf = Buffer.from(storedOtp.padEnd(6, '\0'));
  const correct = answerBuf.length === storedBuf.length &&
    crypto.timingSafeEqual(answerBuf, storedBuf);

  event.response.answerCorrect = correct;

  if (correct) {
    // Delete the consumed OTP immediately to prevent replay
    await safeDelete(otpId);
    console.log('OTP verified and consumed');
  } else {
    console.warn('Incorrect OTP provided');
  }

  return event;
};

async function safeDelete(otpId) {
  try {
    await ddb.send(new DeleteItemCommand({
      TableName: OTP_TABLE,
      Key: { otpId: { S: otpId } },
    }));
  } catch (err) {
    // Log but do not fail the auth response — TTL will clean up
    console.error('Failed to delete OTP record:', err.message);
  }
}
