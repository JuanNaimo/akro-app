// Navegación completa, no la del router de Next: descarta todo lo que la app tiene en memoria
// (formularios, caché del router). Al salir no puede quedar nada de la cuenta anterior, como
// el mail precargado en /login.
export function hardNavigate(url: string): void {
  window.location.assign(url);
}
