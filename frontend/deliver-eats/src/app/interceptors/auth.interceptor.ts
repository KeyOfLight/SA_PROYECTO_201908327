import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '../service/auth/auth';
import { Utils } from '../service/utils/utils';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const utils = inject(Utils);
  const token = utils.getToken();

  // Si existe un token, lo agregamos a los headers
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
