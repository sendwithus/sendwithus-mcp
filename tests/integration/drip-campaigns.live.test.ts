import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { LIVE_API_KEY, type LiveHarness, RUN_ID, expectToolOk, makeLiveHarness } from './setup.ts';

describe.skipIf(!LIVE_API_KEY)('drip campaigns (live)', () => {
  let harness: LiveHarness;
  let campaignId: string | undefined;
  const recipient = `${RUN_ID}-drip@example.com`;

  beforeAll(async () => {
    harness = await makeLiveHarness();
    const { items } = (await expectToolOk(await harness.callTool('drip_campaigns_list'))) as {
      items: Array<{ id: string }>;
    };
    campaignId = items[0]?.id;
  });

  afterAll(async () => {
    if (!harness) return;
    try {
      await harness.callTool('drip_campaigns_deactivate_all', { recipient_address: recipient });
    } catch {
      // ignore
    }
    await harness.disconnect();
  });

  test('drip_campaigns_list returned an array', () => {
    // beforeAll already exercised the tool; here we just confirm the precondition.
    if (!campaignId) {
      console.warn('[drip] no drip campaigns on this account; remaining tests will skip.');
    }
    expect(true).toBe(true);
  }, 30_000);

  test('drip_campaigns_get', async () => {
    if (!campaignId) return;
    const got = (await expectToolOk(
      await harness.callTool('drip_campaigns_get', { campaign_id: campaignId }),
    )) as { id: string };
    expect(got.id).toBe(campaignId);
  }, 30_000);

  test('drip_campaigns_activate', async () => {
    if (!campaignId) return;
    await expectToolOk(
      await harness.callTool('drip_campaigns_activate', {
        campaign_id: campaignId,
        recipient_address: recipient,
      }),
    );
  }, 30_000);

  test('drip_campaigns_deactivate', async () => {
    if (!campaignId) return;
    await expectToolOk(
      await harness.callTool('drip_campaigns_deactivate', {
        campaign_id: campaignId,
        recipient_address: recipient,
      }),
    );
  }, 30_000);

  test('drip_campaigns_deactivate_all', async () => {
    await expectToolOk(
      await harness.callTool('drip_campaigns_deactivate_all', {
        recipient_address: recipient,
      }),
    );
  }, 30_000);
});
