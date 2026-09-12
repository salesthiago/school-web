import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { InstitutionsService } from '../services/institutions.service';

/**
 * Decide o que mostrar em "/": usuário logado vai direto para o painel do
 * seu perfil (nunca vê a landing page); visitante vê a vitrine de cursos só
 * se a instituição ligou `landingPageEnabled` — senão cai no login, como
 * antes desta feature existir.
 */
export const homeGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const institutionsService = inject(InstitutionsService);
  const router = inject(Router);

  const user = authService.currentUser();
  if (user) {
    const home = user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student';
    router.navigate([home]);
    return false;
  }

  return institutionsService.getPublic().pipe(
    map((institution) => {
      if (institution.landingPageEnabled) return true;
      router.navigate(['/auth/login']);
      return false;
    }),
  );
};
