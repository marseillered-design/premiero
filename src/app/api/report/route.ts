import { NextResponse, type NextRequest } from 'next/server';
import { userFrom } from '@/lib/auth';
import { hasKv } from '@/lib/kv';
import { allowed, cleanReport, dropReport, isAdmin, listReports, saveReport } from '@/lib/reports';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

/** Посетитель сообщает о неверной дате или предлагает релиз. */
export async function POST(req: NextRequest) {
  if (!hasKv()) return NextResponse.json({ error: 'disabled' }, { status: 503 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'bad' }, { status: 400 });
  // поле-ловушка: человек его не видит, а боты заполняют; делаем вид, что всё хорошо
  if (body.website) return NextResponse.json({ ok: true });
  // x-client-ip ставит Worker (Cloudflare знает настоящий адрес); x-forwarded-for посетитель может подделать
  const ip = req.headers.get('x-client-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  if (!(await allowed(ip))) return NextResponse.json({ error: 'limit' }, { status: 429 });
  const user = await userFrom(req);
  const report = cleanReport(body, user?.email ?? null);
  if (!report) return NextResponse.json({ error: 'bad' }, { status: 400 });
  await saveReport(report);
  return NextResponse.json({ ok: true });
}

/** Список сообщений — только владельцу сайта. */
export async function GET(req: NextRequest) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: PRIVATE });
  if (!isAdmin(user.email) || !hasKv()) return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: PRIVATE });
  return NextResponse.json({ reports: await listReports() }, { headers: PRIVATE });
}

/** Убрать обработанное сообщение: ?id=… */
export async function DELETE(req: NextRequest) {
  const user = await userFrom(req);
  if (!user || !isAdmin(user.email) || !hasKv()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: 'bad' }, { status: 400 });
  await dropReport(id);
  return NextResponse.json({ ok: true });
}
