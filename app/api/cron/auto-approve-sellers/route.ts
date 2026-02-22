import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();

  const { data: pendingApps, error: fetchError } = await supabase
    .from('seller_applications')
    .select('*, seller_plans(*)')
    .eq('status', 'pending')
    .lt('auto_approve_at', now);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!pendingApps || pendingApps.length === 0) {
    return NextResponse.json({ message: 'No pending applications to approve', count: 0 });
  }

  let approvedCount = 0;

  for (const app of pendingApps) {
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (app.seller_plans?.duration_days || 30));

    const { error: updateError } = await supabase
      .from('seller_applications')
      .update({
        status: 'approved',
        approved_at: now,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
      })
      .eq('id', app.id);

    if (updateError) continue;

    if (app.shop_id) {
      await supabase
        .from('shops')
        .update({
          tier: 'premium',
          tier_expires_at: validUntil.toISOString(),
        })
        .eq('id', app.shop_id);
    }

    approvedCount++;
  }

  return NextResponse.json({ 
    message: `Auto-approved ${approvedCount} applications`,
    count: approvedCount 
  });
}
