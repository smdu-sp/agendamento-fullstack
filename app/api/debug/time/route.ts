import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const now = new Date();
  return NextResponse.json({
    iso: now.toISOString(),
    utcOffset: -now.getTimezoneOffset() / 60,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}
