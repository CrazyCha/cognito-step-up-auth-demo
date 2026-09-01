// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

const { handler } = require('./index');

function makeEvent(session = []) {
  return {
    userName: 'testuser',
    request: { session },
    response: {},
  };
}

describe('DefineAuthChallenge', () => {
  test('issues CUSTOM_CHALLENGE on empty session', async () => {
    const event = makeEvent([]);
    const result = await handler(event);

    expect(result.response.challengeName).toBe('CUSTOM_CHALLENGE');
    expect(result.response.issueTokens).toBe(false);
    expect(result.response.failAuthentication).toBe(false);
  });

  test('issues tokens when last challenge passed', async () => {
    const session = [
      { challengeName: 'CUSTOM_CHALLENGE', challengeResult: true },
    ];
    const result = await handler(makeEvent(session));

    expect(result.response.issueTokens).toBe(true);
    expect(result.response.failAuthentication).toBe(false);
  });

  test('re-issues challenge on failed attempt below max', async () => {
    const session = [
      { challengeName: 'CUSTOM_CHALLENGE', challengeResult: false },
    ];
    const result = await handler(makeEvent(session));

    expect(result.response.challengeName).toBe('CUSTOM_CHALLENGE');
    expect(result.response.issueTokens).toBe(false);
    expect(result.response.failAuthentication).toBe(false);
  });

  test('fails authentication after max attempts', async () => {
    const session = [
      { challengeName: 'CUSTOM_CHALLENGE', challengeResult: false },
      { challengeName: 'CUSTOM_CHALLENGE', challengeResult: false },
      { challengeName: 'CUSTOM_CHALLENGE', challengeResult: false },
    ];
    const result = await handler(makeEvent(session));

    expect(result.response.issueTokens).toBe(false);
    expect(result.response.failAuthentication).toBe(true);
  });
});
