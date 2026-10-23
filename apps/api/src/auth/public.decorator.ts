import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'akro:public';

// Las rutas piden sesión por defecto: @Public() las abre. En una ruta pública no hay
// @CurrentUser().
export const Public = () => SetMetadata(IS_PUBLIC, true);
