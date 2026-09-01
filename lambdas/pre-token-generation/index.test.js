// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

const { handler } = require('./index');

function makeEvent(clientMetadata) {
  return {
    triggerSource: 'TokenGeneration_Authentication',
    userName: 'testuser',
    request: { clientMetadata },
    response: {},
  };
}

describe('PreTokenGeneration', () => {
  test('injects step_up claims when stepUp=true', async () => {
    const event = makeEvent({ stepUp: 'true', bookingAmount: '8000' });
    const result = await handler(event);

    const claims = result.response.claimsOverrideDetails.claimsToAddOrOverride;
    expect(claims.step_up).toBe('true');
    expect(claims.step_up_at).toBeDefined();
    expect(claims.step_up_booking_amount).toBe('8000');
  });

  test('does not inject claims when stepUp is absent', async () => {
    const event = makeEvent({});
    const result = await handler(event);

    const claims = result.response.claimsOverrideDetails.claimsToAddOrOverride;
    expect(claims.step_up).toBeUndefined();
  });

  test('does not inject claims when clientMetadata is undefined', async () => {
    const event = makeEvent(undefined);
    const result = await handler(event);

    const claims = result.response.claimsOverrideDetails.claimsToAddOrOverride;
    expect(claims.step_up).toBeUndefined();
  });

  test('omits booking amount when not provided', async () => {
    const event = makeEvent({ stepUp: 'true' });
    const result = await handler(event);

    const claims = result.response.claimsOverrideDetails.claimsToAddOrOverride;
    expect(claims.step_up).toBe('true');
    expect(claims.step_up_booking_amount).toBeUndefined();
  });
});
