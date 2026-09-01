// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

const { DynamoDBClient, GetItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const crypto = require('crypto');

const ddb = new DynamoDBClient({});
const OTP_TABLE = process.env.OTP_TABLE_NAME;

/**
 * VerifyAuthChallenge — validates the user's OTP answer.
 *
 * Security properties:
 *   - Expiry is checked explicitly (DynamoDB TTL is eventual; this check is authoritative)
 *   - Constant-time comparison prevents timing-based OTP enumeration
 *   - Consumed OTPs are deleted immediately on success (replay prevention)
 *   - OTP is bound to the userName who initiated the challenge
 */
exports.handler = async (event) => {
  const { privateChallengeParameters, challengeAnswer } = event.request;
  const { otpId } = privateChallengeParameters;

  console.log('VerifyAuthChallenge', JSON.stringify({
    userName: event.userName,
    otpId: otpId || null,
  }));

  event.response.answerCorrect = false;

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

  if (storedUserId !== event.userName) {
    console.warn('OTP user mismatch');
    return event;
  }

  if (nowSec > expiresAt) {
    console.warn('OTP expired');
    await safeDelete(otpId);
    return event;
  }

  // Constant-time comparison prevents timing attacks
  const answerBuf = Buffer.from(String(challengeAnswer).padEnd(6, '\0'));
  const storedBuf = Buffer.from(storedOtp.padEnd(6, '\0'));
  const correct = answerBuf.length === storedBuf.length &&
    crypto.timingSafeEqual(answerBuf, storedBuf);

  event.response.answerCorrect = correct;

  if (correct) {
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
    console.error('Failed to delete OTP record:', err.message);
  }
}
