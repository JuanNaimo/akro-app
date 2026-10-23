# Akro — Roadmap

**Pasito, pero de estudio.** Akro es una app social que convierte estudiar en una actividad compartida y
gamificada: estudiar con otras personas te ayuda a ser constante y a cumplir tus objetivos. Referencias:
Pasito, Strava, Duolingo.

Las Fases 1 y 2 son el **MVP**. La Fase 3 arranca con la puerta «Beta cerrada del MVP»: no se empieza nada
posterior sin antes probar el MVP con estudiantes reales, y el orden de las Fases 3 a 7 se revisa con lo que
salga de esa prueba. Cada ítem lleva la metadata de [Roadmapper](https://github.com/SantiagoBaezDuic/roadmapper)
(estado, esfuerzo, dependencias y si falta una decisión). Para verlo como mapa:
`npx --yes github:SantiagoBaezDuic/roadmapper`.

Esfuerzo: **S** horas · **M** pocos días · **L** 1–2 semanas · **XL** un proyecto en sí.

---

## Principios

**Estudiar es la recompensa.** Los puntos, niveles y premios acompañan, pero nunca pueden importar más que
estudiar.

**Intención antes que horas.** Una sesión vale por lo que avanzaste, no por cuánto tiempo estuvo prendido el
cronómetro. Si Akro se vuelve un contador de horas, alcanza con dejarlo corriendo.

**Lo social empuja.** Amigos, toques y grupos son el motor de la constancia: Akro se diseña para estudiar con
otros, no para estudiar solo con un ranking al lado.

**Presión a medida.** Cada uno elige cuánto lo apura Akro, y siempre hay una salida cuando estás bajón (SOS,
sesión de 10 minutos, semana liviana).

## Decisiones tomadas

| Tema | Decisión | Fecha |
|---|---|---|
| Plataforma | PWA (web instalable), mobile-first. La app nativa y el bloqueo de apps quedan estacionados. | 2026-10-22 |
| Backend | NestJS sobre Postgres, con Drizzle como capa de datos (recomendado, a confirmar). | 2026-10-22 |
| Front | Next.js (React) como PWA, con Serwist para el service worker. | 2026-10-22 |
| Auth | Sesiones propias: cookie httpOnly + tabla de sesiones en Postgres, contraseñas con argon2id. | 2026-10-22 |
| Hosting | Docker Compose en un servidor propio; más adelante, el mismo compose en un VPS (DigitalOcean o similar). | 2026-10-22 |
| MVP | Estudio y progreso (Fase 1) + amigos, toques, push y calendario de exámenes (Fase 2). | 2026-10-22 |
| IA | El quiz con IA y la evaluación con Jev quedan fuera del MVP (Fase 7). | 2026-10-22 |
| Público | **Supuesto, a confirmar:** estudiantes universitarios de Argentina; la app está en español rioplatense. | 2026-10-22 |

---

## Infraestructura

- **Servidor de API** — NestJS + Drizzle sobre Postgres: módulos, migraciones, validación, tests y manejo de
  errores, en un monorepo (pnpm) con la web y un paquete de tipos compartidos.
  <!-- id=api kind=infra status=next effort=L
    why="Las consultas fuertes de Akro (rachas, feed, rankings, rachas grupales) son SQL con CTEs y funciones de
    ventana: Drizzle las escribe tipadas sin salir del ORM y genera migraciones en SQL legible. Entra a Nest
    como un provider propio, porque no tiene un módulo oficial. Todo lo demás cuelga de acá." -->
- **App web (PWA) base** — Next.js (App Router) con Serwist para el service worker, manifest para que se pueda
  instalar y un sistema de diseño mínimo.
  <!-- id=web_app kind=infra status=next effort=M
    why="Se diseña mobile-first: casi siempre se va a usar desde el celular. Next no trae soporte de PWA
    propio, y Serwist (el sucesor de next-pwa) arma el service worker, que también recibe las push. Web y API
    van bajo el mismo dominio (el proxy manda /api a Nest), así la cookie de sesión es de primera parte y no
    hace falta CORS." -->
- **Deploy y entornos** — Docker Compose en un servidor propio: proxy con HTTPS, Next, Nest, worker y
  Postgres; staging y producción; CI que construye las imágenes; backups fuera del servidor.
  <!-- id=deploy kind=infra effort=M deps=api,web_app checklist="Checklist del servidor"
    why="Primero en un servidor propio y después el mismo compose en un VPS (DigitalOcean o similar). Si el
    servidor está en una red hogareña con CGNAT, que es común en los proveedores de acá, no se pueden abrir
    puertos: Cloudflare Tunnel lo expone con HTTPS sin abrir nada. La PWA y las push necesitan dominio y
    HTTPS desde el primer día." -->
- **Mail transaccional** — verificación de cuenta y recuperación de contraseña.
  <!-- id=email kind=infra effort=S deps=api -->
- **Jobs programados** — cron y cola para lo que pasa con la app cerrada: el cierre del día de cada usuario
  (rachas), push programadas y recordatorios.
  <!-- id=jobs kind=infra effort=M deps=api
    why="Con pg-boss sobre el mismo Postgres (sin sumar Redis), en un proceso worker aparte del API. El cierre
    del día tiene que respetar la zona horaria de cada usuario: no se pueden evaluar todas las rachas a la
    medianoche de Buenos Aires." -->
- **Web Push** — claves VAPID, suscripciones por dispositivo, envío desde el servidor y limpieza de las
  suscripciones vencidas.
  <!-- id=webpush kind=infra effort=M deps=api,web_app
    why="En iOS (16.4+) las push web solo llegan si la PWA está instalada en la pantalla de inicio, así que el
    onboarding tiene que empujar la instalación. Una PWA no puede programar notificaciones locales: toda
    alarma (fin de Pomodoro, recordatorios) sale del servidor." -->
- **Métricas de producto** — eventos y un panel mínimo: retención a 1, 7 y 30 días, días cumplidos frente a
  los planificados, toques que terminan en una sesión.
  <!-- id=analytics kind=infra effort=S deps=api
    why="Sin esto la beta no tiene cómo responder la pregunta que importa: ¿la gente estudia más y con más
    constancia?" -->
- **Tiempo real** — WebSockets para presencia en vivo y sesiones grupales.
  <!-- id=realtime kind=infra effort=M deps=api
    why="No hace falta para el MVP: «X empezó a estudiar» es una push, y «Estudiando ahora» se puede refrescar
    al abrir la app." -->
- **Almacenamiento de archivos** — almacenamiento compatible con S3 para los PDFs.
  <!-- id=storage kind=infra effort=S deps=api -->

## Checklist del servidor

- [ ] Dominio propio, con el DNS en Cloudflare si se usa el túnel.
- [ ] Docker y Docker Compose en el servidor, con el compose versionado en el repo.
- [ ] Proxy con HTTPS (Caddy): `/api` va a Nest y el resto a Next.
- [ ] Servidor accesible desde afuera (Cloudflare Tunnel si hay CGNAT o no se pueden abrir puertos).
- [ ] Postgres con volumen persistente y backup diario fuera del servidor, con una restauración probada.
- [ ] Staging y producción separados: dos stacks del mismo compose.
- [ ] CI que corre los tests, construye las imágenes y despliega.
- [ ] Secretos fuera del repo (sesión, VAPID, SMTP).
- [ ] Monitoreo mínimo: uptime y logs.

## Fase 1 — MVP: estudio y progreso

La mitad individual del MVP: Akro tiene que servir para estudiar aunque todavía no tengas amigos adentro.

- **Cuentas y login** — mail y contraseña con sesiones propias, verificación de mail y recuperación de
  contraseña; Google, más adelante.
  <!-- id=auth effort=M deps=api,web_app,email
    why="Las sesiones son propias para tener el control, y por eso la seguridad corre por nuestra cuenta.
    Contraseñas con argon2id. Los tokens de sesión, verificación y reset se guardan hasheados y con
    vencimiento. Límite de intentos de login (@nestjs/throttler). Contra CSRF, cookies SameSite=Lax y chequeo
    de Origin. Google se suma con OAuth (librería arctic) cuando haga falta." -->
- **Perfil** — nombre, @usuario para que te encuentren, avatar (iniciales o emoji en el MVP) y, opcional,
  carrera y facultad.
  <!-- id=profile effort=S deps=auth -->
- **Materias, unidades y temas** — cargar la estructura de cada materia (también pegando el programa, un
  tema por línea), marcar el estado de cada tema (pendiente, estudiando, visto, repasado) y ver el avance por
  unidad y por materia.
  <!-- id=subjects effort=L deps=auth
    why="Es la base de «estudiar con intención»: las sesiones, el progreso y, más adelante, el planificador y
    los quizzes cuelgan de los temas, no de horas sueltas." -->
- **Sesiones de estudio** — cronómetro y Pomodoro: al arrancar elegís materia, tema y qué querés lograr; al
  cerrar marcás qué avanzaste.
  <!-- id=sessions effort=L deps=subjects
    why="En una PWA los timers se frenan en segundo plano: el tiempo se calcula desde el inicio guardado en el
    servidor, no contando ticks. Así la sesión sobrevive a cerrar la pestaña o a cambiar de app." -->
- **Estudio con intención** — las reglas para que Akro no sea un contador de horas: sin tema elegido no hay
  XP, hay un tope de minutos por sesión, la sesión se pausa si dejás la app un rato largo («¿seguís
  estudiando?») y cerrar temas vale más que sumar minutos.
  <!-- id=intent effort=M deps=sessions decision
    why="Es el riesgo que marca el brainstorming: dejar el cronómetro prendido y listo. Hay que definir cuánto
    pesa el tiempo frente al avance de temas y qué hacer con las sesiones sospechosas. Más adelante, el quiz
    con IA (Fase 7) suma una validación más fuerte." -->
- **Aviso de fin de Pomodoro** — una push cuando termina el bloque o el descanso, aunque la app esté cerrada.
  <!-- id=pomodoro_push effort=S deps=sessions,webpush,jobs -->
- **Días de estudio y meta diaria** — elegir qué días vas a estudiar y qué cuenta como día cumplido (por
  ejemplo, 1 Pomodoro o 30 minutos con intención).
  <!-- id=schedule effort=S deps=auth -->
- **Racha individual** — días cumplidos seguidos, contando solo los días que elegiste: los días libres no la
  cortan.
  <!-- id=streak effort=M deps=schedule,sessions,intent,jobs decision
    why="Falta definir la regla por defecto hasta que lleguen los modos de presión (Fase 3): ¿se corta al primer
    día fallado o hay un día de gracia? Se evalúa al cierre del día, en la zona horaria del usuario." -->
- **XP y niveles** — XP por sesiones con intención, temas cerrados y días de racha, con una curva de niveles.
  <!-- id=xp effort=M deps=intent,streak
    why="Guardar cada evento que da XP en un registro (ledger), no solo el total: los puntos canjeables de la
    Fase 5 salen de los mismos eventos sin migrar nada." -->
- **Mi progreso** — pantalla personal: avance por materia, horas con intención por semana, racha, nivel y
  temas cerrados.
  <!-- id=my_progress effort=M deps=subjects,xp -->

## Fase 2 — MVP: amigos, toques y calendario

La mitad social del MVP. Cuando se cierra esta fase, arranca la beta cerrada (la puerta de la Fase 3).

- **Amigos** — buscar por @usuario o invitar con un link (para mandarlo por WhatsApp); la amistad es mutua y
  arranca con una solicitud.
  <!-- id=friends effort=M deps=profile -->
- **Feed de progreso** — lo que hicieron tus amigos: sesiones terminadas (con el tema), temas cerrados, rachas
  y niveles, con un «aplauso» de un toque.
  <!-- id=feed effort=L deps=friends,sessions,xp decision
    why="Privacidad: ¿se ven los nombres de las materias y los temas, o solo la actividad? Conviene un ajuste por
    materia desde el principio." -->
- **Estudiando ahora** — en la home, qué amigos están en una sesión en este momento.
  <!-- id=studying_now effort=S deps=friends,sessions -->
- **Toques** — mandarle un toque a un amigo para que se ponga a estudiar, como el zumbido del MSN; le llega
  como push.
  <!-- id=pokes effort=M deps=friends,webpush
    why="Con un límite (por ejemplo, un toque por amigo por día) para que no se vuelva spam. Es la semilla de los
    desafíos y las apuestas de las Fases 4 y 5." -->
- **Push «X empezó a estudiar»** — un aviso a los amigos cuando alguien arranca una sesión, para que se sumen.
  <!-- id=start_push effort=M deps=friends,sessions,webpush
    why="Riesgo de ruido: agrupar los avisos («3 amigos están estudiando»), limitarlos por hora y respetar el
    horario silencioso." -->
- **Preferencias de notificaciones** — silenciar por tipo o por amigo y elegir un horario silencioso.
  <!-- id=notif_prefs effort=S deps=pokes,start_push -->
- **Calendario de exámenes** — parciales, finales, entregas y otras fechas, atadas a una materia (y a las
  unidades que entran), con cuenta regresiva en la home.
  <!-- id=calendar effort=M deps=subjects -->
- **Recordatorios de exámenes** — una push unos días antes de cada fecha, con lo que te falta de las unidades
  que entran.
  <!-- id=exam_reminders effort=S deps=calendar,webpush,jobs -->
- **Onboarding e instalación** — instalar la PWA (en iOS es requisito para recibir push), dar permiso de
  notificaciones, elegir los días de estudio, cargar la primera materia e invitar amigos.
  <!-- id=onboarding effort=M deps=schedule,subjects,friends,webpush -->

## Checklist de la beta

- [ ] Producción con HTTPS, backups y un staging aparte.
- [ ] Probado como PWA instalada en iOS y Android, push incluidas.
- [ ] Métricas de retención y de días cumplidos funcionando.
- [ ] Criterio de éxito escrito antes de arrancar (por ejemplo, qué porcentaje sigue activo a las 4 semanas).
- [ ] Grupo de beta armado: unos 20–30 estudiantes, en grupos de amigos reales y en plena cursada.
- [ ] Un canal para recibir feedback (un grupo de WhatsApp o un formulario dentro de la app).
- [ ] Revisión de resultados y reordenamiento de las Fases 3 a 7.

## Fase 3 — Motivación y presión

La primera fase post-MVP: lo que ayuda cuando estás bajón y no podés cumplir tus objetivos.

- **Beta cerrada del MVP** — Akro en manos de un grupo chico de estudiantes durante unas semanas de cursada,
  midiendo si estudian más y con más constancia.
  <!-- id=beta kind=gate effort=M
    deps=my_progress,feed,studying_now,notif_prefs,exam_reminders,onboarding,pomodoro_push,analytics,deploy
    checklist="Checklist de la beta"
    why="La puerta del post-MVP: antes de sumar features, confirmar que el núcleo funciona y reordenar las fases
    siguientes con lo que diga la beta." -->
- **Modos de presión** — cada uno elige cuánto lo presiona Akro: relajado (te perdona algún día), normal o
  estricto (si no cumplís, se corta la racha).
  <!-- id=pressure effort=M deps=beta,streak decision
    why="Definir las reglas de cada modo, si se puede cambiar de modo en cualquier momento (y si eso sirve para
    salvar una racha) y si los días perdonados se ganan o vienen fijos." -->
- **Sesión de 10 minutos** — un botón de «solo 10 minutos» para arrancar cuando no hay ganas; si seguís, la
  sesión continúa como cualquier otra.
  <!-- id=kickstart effort=S deps=beta,sessions decision
    why="¿Cuenta para la racha? Si cuenta, puede volverse el mínimo de todos los días; si no cuenta, pierde
    fuerza como empujón." -->
- **Objetivos semanales** — metas concretas para la semana, como «cerrar la unidad 2 de Análisis» o «5
  Pomodoros de Física», con su avance.
  <!-- id=weekly_goals effort=M deps=beta,subjects,sessions -->
- **Semana liviana** — bajar temporalmente los objetivos de la semana sin perder la racha, con un límite de
  usos.
  <!-- id=light_week effort=S deps=weekly_goals,pressure -->
- **Mensajes para volver** — push cuando perdés el ritmo o cuando la racha está por cortarse, con un tono que
  depende del modo de presión.
  <!-- id=comeback effort=M deps=pressure,webpush,jobs -->

## Fase 4 — Grupos y estudio en compañía

- **Grupos de estudio** — crear un grupo, invitar con un link, roles y el feed del grupo.
  <!-- id=groups effort=L deps=beta,friends,feed -->
- **Racha grupal** — la racha del grupo sigue mientras todos cumplan sus días.
  <!-- id=group_streak effort=M deps=groups,streak,pressure decision
    why="¿Tienen que cumplir todos o alcanza con un porcentaje? ¿Cómo convive con el modo de presión de cada
    integrante? Si uno solo puede cortarla, puede generar más culpa que motivación." -->
- **Objetivos grupales** — objetivos que solo se cumplen si todos los integrantes cumplen su parte.
  <!-- id=group_goals effort=M deps=groups,weekly_goals -->
- **SOS al grupo** — «no tengo ganas»: le avisa al grupo, que puede responder con un toque, un mensaje o una
  sesión de 10 minutos juntos.
  <!-- id=sos effort=M deps=groups,pokes,kickstart -->
- **Desafíos** — mandarle un desafío a un amigo o al grupo («estudiá 30 minutos hoy»): se acepta, se cumple o
  no, y el resultado sale en el feed.
  <!-- id=challenges effort=M deps=beta,pokes,intent
    why="Es la evolución natural de los toques. Se valida con las mismas reglas de estudio con intención." -->
- **Sesiones grupales** — arrancar una sesión juntos, con un Pomodoro sincronizado, y ver quién está
  estudiando.
  <!-- id=group_sessions effort=L deps=groups,realtime,sessions -->
- **Salas de estudio por tema** — salas por materia o tema, como un canal de Discord: estudiás en compañía de
  gente que está en lo mismo.
  <!-- id=rooms effort=L deps=group_sessions decision
    why="Si las salas son públicas, hace falta moderación (reportes, bloqueos) y decidir si hay chat o solo
    presencia. Empezar con salas privadas por link es mucho más barato." -->

## Fase 5 — Puntos y recompensas

Los puntos nunca pueden pesar más que estudiar: no se compran con plata y las recompensas son, a propósito,
cosas inútiles.

- **Puntos canjeables** — una moneda aparte de la XP que se gana por estudiar con intención, cumplir
  objetivos, mantener rachas y completar desafíos, con saldo e historial.
  <!-- id=points effort=M deps=xp,weekly_goals,challenges
    why="Salen de los mismos eventos que la XP. Con topes diarios para que nadie junte puntos sin estudiar." -->
- **Tienda de recompensas inútiles** — cosméticos para gastar los puntos: marcos de avatar, temas de color,
  stickers para los toques, títulos.
  <!-- id=shop effort=L deps=points decision
    why="Definir el catálogo inicial y cómo se lucen las recompensas en el perfil y en el feed: que sean
    sociales es lo que las hace divertidas." -->
- **Premios grupales propios** — el grupo se pone su propio premio y Akro sigue el objetivo: «un juego de
  Steam si la racha grupal llega a 10 días», «si llegamos a 5000 puntos, vamos a tal lado».
  <!-- id=group_rewards effort=M deps=group_goals,group_streak,points
    why="El premio es real, pero lo pone el grupo: Akro no maneja plata ni compra nada, solo sigue el objetivo y
    lo celebra cuando se cumple." -->
- **Apuestas de puntos** — apostar puntos en un desafío entre amigos; quedan retenidos hasta que el desafío se
  resuelve.
  <!-- id=bets effort=M deps=challenges,points decision
    why="Hay que evitar el abuso (cuentas armadas para pasarse puntos, apuestas arregladas): topes por apuesta
    y por día, y solo entre amigos." -->

## Fase 6 — Planificación y métodos de estudio

Lo que convierte a Akro en un sistema de estudio y no solo en un tracker.

- **Planificador de estudio** — le cargás qué tenés que estudiar, cuánto tiempo tenés por día y para cuándo
  lo necesitás, y Akro reparte los temas y las horas entre los días disponibles.
  <!-- id=planner effort=XL deps=beta,calendar,subjects,weekly_goals decision
    why="Definir el algoritmo: el peso de cada tema, los días de repaso antes del examen y qué pasa cuando te
    atrasás (¿se replanifica solo o te pregunta?)." -->
- **Hoy te toca** — la home muestra el plan del día y arranca la sesión con el tema ya elegido.
  <!-- id=today_plan effort=M deps=planner,sessions -->
- **Guía de métodos de estudio** — fichas cortas sobre cada método (Pomodoro, recuerdo activo, repetición
  espaciada, técnica Feynman, mapas mentales): qué es, cuándo conviene y cómo usarlo.
  <!-- id=methods effort=M deps=beta -->
- **Temporizadores por método** — sesiones preconfiguradas según el método: 52/17, Pomodoro largo, bloques de
  repaso.
  <!-- id=method_timers effort=M deps=methods,sessions -->

## Fase 7 — Estudio con IA

Queda fuera del MVP por costo y complejidad. Es también el antitrampa más fuerte: demostrar que aprendiste,
no solo que tuviste la app abierta.

- **Carga de PDFs** — subir apuntes, resúmenes o bibliografía de cada materia o unidad y extraer el texto.
  <!-- id=pdf_upload effort=M deps=beta,subjects,storage decision
    why="Hay que definir los límites de tamaño, qué hacer con los PDFs escaneados (OCR) y cuánto tiempo se
    guardan. Son archivos del usuario, a veces material de la cátedra: no se comparten con nadie." -->
- **Preguntas generadas con IA** — un modelo arma una serie de preguntas sobre el material (de opción
  múltiple y de desarrollo).
  <!-- id=quiz_gen effort=L deps=pdf_upload decision
    why="Hay que elegir el proveedor y el modelo, y cómo asegurar que las preguntas salgan del material y no sean
    inventadas." -->
- **Evaluación con Jev** — Jev, la IA probabilística, evalúa si cada respuesta está bien o mal y devuelve un
  porcentaje con su corrección.
  <!-- id=jev effort=L deps=quiz_gen decision
    why="Como es probabilística, hay que definir el umbral de «porcentaje decente» y qué hacer con las
    evaluaciones de baja confianza (¿pedir otra respuesta?, ¿no contar esa pregunta?)." -->
- **Puntos por demostrar conocimiento** — si sacás un porcentaje decente, ganás puntos y el tema queda como
  dominado.
  <!-- id=knowledge_points effort=M deps=jev,points -->
- **Límites y costos de IA** — cuotas por usuario, preguntas cacheadas por PDF y monitoreo del gasto.
  <!-- id=ai_costs effort=M deps=quiz_gen
    why="Cada quiz cuesta plata: sin cuotas, un solo usuario puede consumir el presupuesto de todo el mes." -->

## Estacionado

Ideas que quedan afuera a propósito: por ahora no se tocan.

- **App nativa** — una versión con Expo o React Native, si la PWA se queda corta (push en iOS sin instalar,
  timers en segundo plano, bloqueo de apps).
  <!-- id=native_app effort=XL
    why="Se descartó para arrancar porque la PWA se itera más rápido, pero es la condición para bloquear
    apps." -->
- **Bloqueo del celular o de apps** — bloquear las apps que distraen mientras estudiás.
  <!-- id=app_blocking effort=L deps=native_app
    why="Desde una PWA es imposible: necesita la API de Screen Time en iOS y permisos de uso o de accesibilidad
    en Android. Mientras tanto, lo más cercano es detectar cuándo salís de Akro (ítem «Estudio con
    intención»)." -->
- **Cursos y contenido propio** — cursos o contenido educativo de Akro, si crece bastante.
  <!-- id=courses effort=XL
    why="El brainstorming lo deja para el futuro: al principio, el foco es estudiar + amigos + progreso +
    motivación + planificación." -->
