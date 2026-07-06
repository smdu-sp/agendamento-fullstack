import { handlers } from '@/lib/auth/auth';
import { NextRequest } from 'next/server';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/agendamento';

// Corrige a URL para incluir o basePath se necessário
function fixRequestUrl(request: NextRequest): NextRequest {
  const pathname = request.nextUrl.pathname;
  
  // Se o pathname não começa com o basePath, adiciona
  if (!pathname.startsWith(basePath)) {
    const newUrl = request.nextUrl.clone();
    newUrl.pathname = `${basePath}${pathname}`;
    return new NextRequest(newUrl, request);
  }
  
  return request;
}

export async function GET(request: NextRequest) {
  const fixedRequest = fixRequestUrl(request);
  return handlers.GET(fixedRequest);
}

export async function POST(request: NextRequest) {
  const fixedRequest = fixRequestUrl(request);
  return handlers.POST(fixedRequest);
}