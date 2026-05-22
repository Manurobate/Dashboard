import { HttpInterceptorFn } from '@angular/common/http';

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  const pathname = req.url.startsWith('http')
    ? new URL(req.url).pathname
    : req.url;
  if (pathname.startsWith('/api/')) {
    return next(req.clone({
      setHeaders: { 'X-Requested-With': 'XMLHttpRequest' },
    }));
  }
  return next(req);
};
