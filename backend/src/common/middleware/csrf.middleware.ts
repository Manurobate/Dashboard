import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (!SAFE_METHODS.has(req.method)) {
      if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
        throw new ForbiddenException('En-tête CSRF manquant');
      }
    }
    next();
  }
}
