// ESTADO GLOBAL DE LA APLICACIÓN
const AppState = {
  currentUser: null,
  demoUsers: [
    {
      id: 'USR-ADM-00',
      nombre: 'Diego A. Cristaldo (Admin ARAUCO)',
      email: 'diego.a.cristaldo@arauco.com',
      rol: 'GESTIONADOR',
      sector: 'Administración General de Andamios y Paradas',
      legajo: '50100',
      centroCostos: 'CC-SUP-00'
    },
    {
      id: 'USR-SOL-01',
      nombre: 'Juan Pérez (Mantenimiento)',
      email: 'juan.perez@arauco.com',
      rol: 'SOLICITANTE',
      sector: 'Mantenimiento Mecánico',
      legajo: '74821',
      centroCostos: 'CC-MTTO-01'
    },
    {
      id: 'USR-ADM-01',
      nombre: 'Ing. Marcelo Rossi (Gestionador ARAUCO)',
      email: 'marcelo.rossi@arauco.com',
      rol: 'GESTIONADOR',
      sector: 'Administración de Andamios y Paradas',
      legajo: '50112'
    },
    {
      id: 'USR-CONTR-01',
      nombre: 'Supervisor Obra (Andamios del Sur)',
      email: 'montajes@andamiosdelsur.com',
      rol: 'EMPRESA_SERVICIO',
      empresaId: 'EMP-01',
      empresaNombre: 'Andamios del Sur S.A.'
    }
  ],
  empresas: [
    { id: 'EMP-01', nombre: 'Andamios del Sur S.A.', contacto: 'Carlos Méndez', telefono: '+54 9 11 5555-0101' },
    { id: 'EMP-02', nombre: 'Montajes Industriales NOA', contacto: 'Roberto Vaca', telefono: '+54 9 11 5555-0202' }
  ],
  sistemaInfo: null,
  activeTabSolicitante: 'anual', // 'anual', 'pgp', 'historico'
  activeTabGestionador: 'semanal', // 'semanal', 'bandeja', 'parque', 'desarmes', 'certificacion', 'auditoria', 'kpis', 'solicitar'
  activeTabEjecutante: 'ordenes', // 'ordenes', 'desarmes', 'produccion'
  misSolicitudes: [],
  metricasSolicitante: null,
  datosLotePrevisualizado: null,
  todasSolicitudesGestionador: [],
  metricasGestionador: null,
  pedidosSeleccionados: new Set(),
  ordenesEjecutante: [],
  metricasEjecutante: null,
  solicitudParaHabilitar: null,
  datosCertificacion: null,
  empresaFiltroCert: 'TODAS'
};

// LISTA OFICIAL DE 11 PUNTOS DEL CHECKLIST ARAUCO
const CHECKLIST_11_PUNTOS = [
  "¿La estructura cuenta con bases de apoyo (fija, regulables o de husillos o con ruedas)?",
  "¿Las plataformas cumplen con el requisito de no ser apoyadas sobre estructuras que no forman parte estructural del andamio (cañerías, bandejas porta-cables eléctricos, etc.)?",
  "¿Cuenta con doble barandas ubicadas a 50 cm y a 100 cm de altura con respecto a la plataforma de trabajo?",
  "¿Posee rodapiés en todo el perímetro de la plataforma de trabajo?",
  "¿Se utilizaron tablones metálicos con superficie antideslizante y con dispositivo de unión o 'seguro' que impida su desplazamiento o levantamiento accidental?",
  "¿El ascenso y descenso de personas se realiza por el interior del andamio? (Sólo se permitirá el ascenso y descenso por el exterior del andamio cuando exista imposibilidad de instalar escaleras internas)",
  "¿La estructura cuenta con puerta de acceso a la plataforma de trabajo? (Sólo para los casos de excepción en los que el acceso vertical a una plataforma deba hacerse por el exterior del andamio)",
  "¿Posee escaleras portátiles marineras externas? Se deberán atar en extremo superior en los sectores autorizados.",
  "¿El acceso a la plataforma de trabajo se realiza mediante escalera interna inclinada? (Sólo se permitirá la colocación de escalerillas verticales cuando exista imposibilidad de instalar una escalerilla en pendiente)",
  "¿El andamio cuenta con cartel de habilitación?",
  "¿Las plataformas cuentan con aberturas rebatibles (escotillas) que permiten el acceso entre niveles verticales y la cobertura del hueco de la escalerilla?"
];

// Registro de Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('ServiceWorker registrado:', reg.scope))
      .catch(err => console.log('ServiceWorker error:', err));
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  verificarSesion();
  await cargarMetadatos();
});

async function cargarMetadatos() {
  try {
    const [resUsers, resEmpresas, resInfo] = await Promise.all([
      fetch('/api/usuarios/demo').then(r => r.json()),
      fetch('/api/empresas').then(r => r.json()),
      fetch('/api/sistema/info').then(r => r.json())
    ]);

    if (resUsers.ok) AppState.demoUsers = resUsers.usuarios;
    if (resEmpresas.ok) AppState.empresas = resEmpresas.empresas;
    if (resInfo.ok) AppState.sistemaInfo = resInfo;
  } catch (err) {
    console.error('Error cargando metadatos iniciales:', err);
  }
}

function verificarSesion() {
  const saved = localStorage.getItem('andamios_session');
  if (saved) {
    try {
      AppState.currentUser = JSON.parse(saved);
      actualizarUserBar();
      renderPortalPorRol();
      return;
    } catch (e) {
      localStorage.removeItem('andamios_session');
    }
  }
  renderLogin();
}

function actualizarUserBar() {
  const userBar = document.getElementById('userBar');
  const roleBadge = document.getElementById('activeRoleBadge');
  const userName = document.getElementById('activeUserName');
  const btnLogout = document.getElementById('btnLogout');

  if (!userBar) return;

  if (!AppState.currentUser) {
    userBar.style.display = 'none';
    return;
  }

  userBar.style.display = 'flex';
  const rol = AppState.currentUser.rol;
  roleBadge.textContent = rol === 'SOLICITANTE' ? 'SOLICITANTE' :
    rol === 'GESTIONADOR' ? 'ADMIN GESTIONADOR' : 'EMPRESA EJECUTORA';

  roleBadge.className = 'role-badge ' + (
    rol === 'SOLICITANTE' ? 'solicitante' :
      rol === 'GESTIONADOR' ? 'gestionador' : 'ejecutante'
  );

  const subInfo = AppState.currentUser.sector || AppState.currentUser.empresaNombre || '';
  userName.innerHTML = `${AppState.currentUser.nombre} <small style="opacity: 0.7; font-weight: normal; margin-left: 4px;">(${subInfo})</small>`;

  // Botón para alternar a Modo Solicitante si es Admin / Gestionador
  let btnToggle = document.getElementById('btnToggleModoAdmin');
  if (rol === 'GESTIONADOR') {
    if (!btnToggle) {
      btnToggle = document.createElement('button');
      btnToggle.id = 'btnToggleModoAdmin';
      btnToggle.className = 'btn btn-outline';
      btnToggle.style.cssText = 'font-size: 0.8rem; padding: 0.35rem 0.65rem; border-color: #38bdf8; color: #38bdf8; font-weight: 600;';
      userBar.insertBefore(btnToggle, btnLogout);
    }
    btnToggle.style.display = 'inline-flex';
    if (AppState.adminViewMode === 'SOLICITANTE') {
      btnToggle.innerHTML = '🛡️ Volver a Centro de Control';
      btnToggle.title = 'Regresar al Panel de Gestión General';
    } else {
      btnToggle.innerHTML = '📝 Modo Solicitante';
      btnToggle.title = 'Operar como solicitante para cargar pedidos propios o planillas masivas';
    }
    btnToggle.onclick = () => {
      AppState.adminViewMode = AppState.adminViewMode === 'SOLICITANTE' ? 'GESTIONADOR' : 'SOLICITANTE';
      actualizarUserBar();
      renderPortalPorRol();
    };
  } else {
    if (btnToggle) btnToggle.style.display = 'none';
  }

  btnLogout.onclick = () => {
    if (confirm('¿Desea cerrar la sesión actual?')) {
      localStorage.removeItem('andamios_session');
      AppState.currentUser = null;
      actualizarUserBar();
      renderLogin();
    }
  };
}

/* ========================================================
   VISTA DE LOGIN CON AUTENTICACIÓN SEGURA Y CONTRASEÑAS
   ======================================================== */
const DIRECTORIO_CREDENCIALES = [
  { rolLabel: '🛡️ Admin General ARAUCO', sub: 'Diego A. Cristaldo (Supervisión)', email: 'diego.a.cristaldo@arauco.com', pass: 'Arauco!2026' },
  { rolLabel: '🛡️ Gestionador ARAUCO', sub: 'Ing. Marcelo Rossi (Supervisión Planta)', email: 'marcelo.rossi@arauco.com', pass: 'Arauco!2026' },
  { rolLabel: '👤 Solicitante Mantenimiento', sub: 'Juan Pérez (Taller Central)', email: 'juan.perez@arauco.com', pass: 'Arauco!2026' },
  { rolLabel: '👤 Solicitante Producción', sub: 'Carlos Gómez (Línea de Fibra)', email: 'carlos.gomez@arauco.com', pass: 'Arauco!2026' },
  { rolLabel: '👷 Contratista Andamios Sur', sub: 'Andamios del Sur S.A. (Supervisor)', email: 'supervisor@andamiosdelsur.com', pass: 'Arauco!2026' },
  { rolLabel: '👷 Contratista Montajes', sub: 'Montajes Industriales S.A. (Supervisor)', email: 'operaciones@montajesind.com', pass: 'Arauco!2026' },
  { rolLabel: '🦺 Seguridad HSE ARAUCO', sub: 'Lic. Roberto Varela (Auditoría)', email: 'auditor.hse@arauco.com', pass: 'Arauco!2026' }
];

function renderLogin() {
  const container = document.getElementById('appContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="auth-wrapper" style="max-width: 580px; margin: 2rem auto;">
      <div class="auth-header" style="text-align: center; margin-bottom: 1.5rem;">
        <span class="brand-badge" style="font-size: 1.6rem; letter-spacing: 2px;">arauco</span>
        <h2 style="margin-top: 1rem; font-size: 1.35rem; color: #fff;">Acceso Seguro al Sistema</h2>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.35rem;">
          Gestión de Provisión de Andamios · Control de Acceso por Perfil y Contraseña
        </p>
      </div>

      <!-- Selector de Modo: Iniciar Sesión / Registrar Nuevo Usuario -->
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem; background: rgba(15, 23, 42, 0.7); padding: 5px; border-radius: 8px; border: 1px solid var(--border);">
        <button type="button" id="tabBtnLogin" onclick="cambiarAuthTab('login')" class="btn" style="flex: 1; justify-content: center; font-size: 0.88rem; padding: 0.55rem; font-weight: 700;">
          🔐 Iniciar Sesión
        </button>
        <button type="button" id="tabBtnRegistro" onclick="cambiarAuthTab('registro')" class="btn btn-outline" style="flex: 1; justify-content: center; font-size: 0.88rem; padding: 0.55rem; font-weight: 700;">
          📝 Registrar Nuevo Usuario
        </button>
      </div>

      <!-- SECCIÓN 1: INICIO DE SESIÓN -->
      <div id="secLogin">
        <!-- Alerta de Error de Inicio de Sesión -->
        <div id="loginErrorAlert" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid var(--danger); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.85rem; color: #fca5a5;"></div>

        <form id="formLogin" onsubmit="handleLoginSubmit(event)" style="background: var(--bg-card); padding: 1.5rem; border-radius: 10px; border: 1px solid var(--border);">
          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">
              Correo Electrónico Corporativo
            </label>
            <input type="email" id="loginEmail" placeholder="usuario@arauco.com" required value="diego.a.cristaldo@arauco.com" style="width: 100%; padding: 0.65rem 0.8rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff;">
          </div>

          <div class="form-group" style="margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label style="font-size: 0.85rem; font-weight: 600;">Contraseña Individual</label>
              <button type="button" onclick="togglePasswordVisibility()" style="background: none; border: none; color: var(--arauco-accent); font-size: 0.78rem; cursor: pointer;">
                <span id="passToggleIcon">👁️ Mostrar</span>
              </button>
            </div>
            <div style="position: relative;">
              <input type="password" id="loginPassword" value="Arauco!2026" placeholder="Ingrese su contraseña..." required style="width: 100%; padding: 0.65rem 0.8rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff;">
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.35rem;">
              <small id="loginHelpText" style="color: var(--text-muted); font-size: 0.75rem;">
                Contraseña por defecto para pruebas: <code>Arauco!2026</code>
              </small>
              <a href="javascript:void(0)" onclick="abrirModalRecuperarPassword()" style="font-size: 0.78rem; color: var(--arauco-accent); text-decoration: underline;">
                ¿Olvidó su contraseña?
              </a>
            </div>
          </div>

          <button type="submit" id="btnSubmitLogin" class="btn" style="width: 100%; justify-content: center; padding: 0.75rem; font-size: 0.95rem; font-weight: 700; background: var(--arauco-green-light); border: none; cursor: pointer;">
            🔐 Iniciar Sesión con Credenciales
          </button>

          <div style="text-align: center; margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 0.75rem;">
            <span style="font-size: 0.82rem; color: var(--text-muted);">¿Aún no tiene cuenta corporativa? </span>
            <a href="javascript:void(0)" onclick="cambiarAuthTab('registro')" style="font-size: 0.82rem; color: var(--arauco-accent); text-decoration: underline; font-weight: 600;">
              Registrarse aquí
            </a>
          </div>
        </form>

        <!-- Acordeón Desplegable con Directorio de Credenciales para Pruebas -->
        <details style="margin-top: 1.5rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 1rem;">
          <summary style="font-size: 0.82rem; font-weight: 600; color: var(--arauco-accent); cursor: pointer; user-select: none;">
            📋 Tabla Resumen de Credenciales de Prueba (Clic para desplegar)
          </summary>
          <div style="margin-top: 0.75rem; font-size: 0.78rem; color: var(--text-muted);">
            <p style="margin-bottom: 0.5rem;">Todas las cuentas de prueba están configuradas con la clave <code>Arauco!2026</code>:</p>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--border); color: #fff;">
                    <th style="padding: 0.4rem;">Perfil / Cargo</th>
                    <th style="padding: 0.4rem;">Correo Electrónico</th>
                    <th style="padding: 0.4rem;">Contraseña</th>
                    <th style="padding: 0.4rem; text-align: right;">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  ${DIRECTORIO_CREDENCIALES.map(c => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                      <td style="padding: 0.4rem; color: #fff;">
                        <strong>${c.rolLabel}</strong><br><small style="color: var(--text-muted);">${c.sub}</small>
                      </td>
                      <td style="padding: 0.4rem; font-family: monospace; color: #93c5fd;">${c.email}</td>
                      <td style="padding: 0.4rem; font-family: monospace; color: #86efac; font-weight: bold;">${c.pass}</td>
                      <td style="padding: 0.4rem; text-align: right;">
                        <button type="button" class="btn btn-outline btn-sm" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;" onclick="autocompletarCredenciales('${c.email}', '${c.pass}')">
                          Usar
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      </div>

      <!-- SECCIÓN 2: REGISTRO DE USUARIO NUEVO (SOLICITANTE MTO / SOLICITANTE PROD / EJECUTOR EESS) -->
      <div id="secRegistro" style="display: none;">
        <div id="regErrorAlert" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid var(--danger); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.85rem; color: #fca5a5;"></div>
        <div id="regSuccessAlert" style="display: none; background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.85rem; color: #86efac;"></div>

        <form id="formRegistro" onsubmit="handleRegistroSubmit(event)" style="background: var(--bg-card); padding: 1.5rem; border-radius: 10px; border: 1px solid var(--border);">
          <div style="margin-bottom: 1.25rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
            <h3 style="margin: 0; font-size: 1.2rem; color: #fff;">📝 Registro de Nuevo Usuario</h3>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin-top: 0.25rem;">
              Complete sus datos y seleccione su función en planta para configurar los accesos correspondientes.
            </p>
          </div>

          <!-- 1. Perfil Requerido con Lista Desplegable -->
          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem; color: #38bdf8;">
              Perfil / Rol en Planta *
            </label>
            <select id="regPerfil" required onchange="actualizarCamposRegistro(this.value)" style="width: 100%; padding: 0.65rem 0.8rem; background: var(--bg-input); border: 1px solid var(--arauco-accent); border-radius: 6px; color: #fff; font-size: 0.92rem; font-weight: 600;">
              <option value="">-- Seleccionar Perfil --</option>
              <option value="SOLICITANTE_MTO">👤 Solicitante Mto (Mantenimiento)</option>
              <option value="SOLICITANTE_PROD">🏭 Solicitante Prod (Producción)</option>
              <option value="EJECUTOR_EESS">👷 Ejecutor EESS (Empresa de Servicios / Contratista)</option>
            </select>
          </div>

          <!-- 2. Nombre y Correo Corporativo -->
          <div class="grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
            <div class="form-group">
              <label style="display: block; font-size: 0.82rem; font-weight: 600; margin-bottom: 0.35rem;">
                Nombre y Apellido *
              </label>
              <input type="text" id="regNombre" placeholder="Ej: Ing. Laura Gómez" required style="width: 100%; padding: 0.6rem 0.75rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff;">
            </div>
            <div class="form-group">
              <label style="display: block; font-size: 0.82rem; font-weight: 600; margin-bottom: 0.35rem;">
                Correo Electrónico *
              </label>
              <input type="email" id="regEmail" placeholder="usuario@arauco.com o eess@empresa.com" required style="width: 100%; padding: 0.6rem 0.75rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff;">
            </div>
          </div>

          <!-- 3. Legajo / ID de Colaborador -->
          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.82rem; font-weight: 600; margin-bottom: 0.35rem;">
              Legajo Personal / ID de Colaborador
            </label>
            <input type="text" id="regLegajo" placeholder="Ej: 74890 o EXT-204" style="width: 100%; padding: 0.6rem 0.75rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff;">
          </div>

          <!-- 4. Campos Dinámicos Condicionales Según Perfil -->
          <!-- Bloque Solicitante Mto -->
          <div id="bloqueSolicitanteMto" style="display: none; background: rgba(30, 41, 59, 0.5); padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.4); margin-bottom: 1rem;">
            <div style="font-size: 0.78rem; font-weight: 700; color: #7dd3fc; margin-bottom: 0.5rem;">
              🔧 Datos Operativos de Mantenimiento
            </div>
            <div class="grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="form-group">
                <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.25rem;">
                  Especialidad Mantenimiento
                </label>
                <select id="regSectorMto" style="width: 100%; padding: 0.55rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 0.82rem;">
                  <option value="Mantenimiento Mecánico">Mantenimiento Mecánico</option>
                  <option value="Mantenimiento Eléctrico">Mantenimiento Eléctrico</option>
                  <option value="Instrumentación y Control">Instrumentación y Control</option>
                  <option value="Mantenimiento Predictivo / Confiabilidad">Confiabilidad / Predictivo</option>
                  <option value="Taller Central y Obras Civiles">Taller Central / Civil</option>
                </select>
              </div>
              <div class="form-group">
                <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.25rem;">
                  Centro de Costos
                </label>
                <input type="text" id="regCcMto" value="CC-MTTO-01" style="width: 100%; padding: 0.55rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 0.82rem;">
              </div>
            </div>
          </div>

          <!-- Bloque Solicitante Prod -->
          <div id="bloqueSolicitanteProd" style="display: none; background: rgba(30, 41, 59, 0.5); padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(74, 222, 128, 0.4); margin-bottom: 1rem;">
            <div style="font-size: 0.78rem; font-weight: 700; color: #86efac; margin-bottom: 0.5rem;">
              🏭 Datos Operativos de Producción
            </div>
            <div class="grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="form-group">
                <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.25rem;">
                  Área de Producción
                </label>
                <select id="regSectorProd" style="width: 100%; padding: 0.55rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 0.82rem;">
                  <option value="Línea de Fibra">Línea de Fibra</option>
                  <option value="Caldera de Recuperación">Caldera de Recuperación</option>
                  <option value="Digestores y Blanqueo">Digestores y Blanqueo</option>
                  <option value="Máquina Secadora y Embalaje">Máquina Secadora y Embalaje</option>
                  <option value="Tratamiento de Agua y Efluentes">Tratamiento de Agua / Efluentes</option>
                  <option value="Parque de Maderas y Astillado">Parque de Maderas / Astillado</option>
                </select>
              </div>
              <div class="form-group">
                <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.25rem;">
                  Centro de Costos
                </label>
                <input type="text" id="regCcProd" value="CC-PROD-02" style="width: 100%; padding: 0.55rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 0.82rem;">
              </div>
            </div>
          </div>

          <!-- Bloque Ejecutor EESS -->
          <div id="bloqueEjecutorEess" style="display: none; background: rgba(30, 41, 59, 0.5); padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(251, 146, 60, 0.4); margin-bottom: 1rem;">
            <div style="font-size: 0.78rem; font-weight: 700; color: #fdba74; margin-bottom: 0.5rem;">
              👷 Datos de Empresa de Servicios Contratista
            </div>
            <div class="grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="form-group">
                <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.25rem;">
                  Empresa Contratista
                </label>
                <select id="regEmpresaEess" style="width: 100%; padding: 0.55rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 0.82rem;">
                  <option value="Andamios del Sur S.A.">Andamios del Sur S.A.</option>
                  <option value="Montajes Industriales S.A.">Montajes Industriales S.A.</option>
                  <option value="Andamios y Estructuras del Plata S.A.">Andamios y Estructuras del Plata S.A.</option>
                </select>
              </div>
              <div class="form-group">
                <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.25rem;">
                  Cargo / Rol en Obra
                </label>
                <select id="regFuncionEess" style="width: 100%; padding: 0.55rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 0.82rem;">
                  <option value="Supervisor de Montaje">Supervisor de Montaje</option>
                  <option value="Capataz de Cuadrilla">Capataz de Cuadrilla</option>
                  <option value="Prevencionista de Riesgos EESS">Prevencionista de Riesgos EESS</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 5. Contraseña y Confirmación -->
          <div class="grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
            <div class="form-group">
              <label style="display: block; font-size: 0.82rem; font-weight: 600; margin-bottom: 0.35rem;">
                Contraseña Individual *
              </label>
              <input type="password" id="regPassword" placeholder="Mínimo 4 caracteres..." required style="width: 100%; padding: 0.6rem 0.75rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff;">
            </div>
            <div class="form-group">
              <label style="display: block; font-size: 0.82rem; font-weight: 600; margin-bottom: 0.35rem;">
                Confirmar Contraseña *
              </label>
              <input type="password" id="regPasswordConfirm" placeholder="Repetir contraseña..." required style="width: 100%; padding: 0.6rem 0.75rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff;">
            </div>
          </div>

          <button type="submit" id="btnSubmitRegistro" class="btn" style="width: 100%; justify-content: center; padding: 0.75rem; font-size: 0.95rem; font-weight: 700; background: var(--arauco-green-light); border: none; cursor: pointer;">
            🚀 Crear Cuenta e Ingresar
          </button>

          <div style="text-align: center; margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 0.75rem;">
            <span style="font-size: 0.82rem; color: var(--text-muted);">¿Ya tiene una cuenta creada? </span>
            <a href="javascript:void(0)" onclick="cambiarAuthTab('login')" style="font-size: 0.82rem; color: var(--arauco-accent); text-decoration: underline; font-weight: 600;">
              Iniciar Sesión aquí
            </a>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal para Recuperación de Contraseña con PIN de Seguridad -->
    <div id="modalRecuperarPassword" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 2000; align-items: center; justify-content: center; padding: 1rem;">
      <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; max-width: 450px; width: 100%; padding: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
          <h3 style="margin: 0; font-size: 1.1rem; color: #fff;">🔐 Recuperación de Contraseña</h3>
          <button type="button" class="btn btn-outline btn-sm" onclick="cerrarModalRecuperarPassword()">✖</button>
        </div>

        <div id="recuperarAlerta" style="display: none; padding: 0.6rem 0.8rem; font-size: 0.8rem; border-radius: 6px; margin-bottom: 1rem;"></div>

        <!-- Paso 1: Ingreso de correo corporativo -->
        <div id="recuperarPaso1">
          <p style="color: var(--text-muted); font-size: 0.82rem; margin-bottom: 1rem;">
            Ingrese su correo corporativo ARAUCO para recibir un código de seguridad PIN de 6 dígitos:
          </p>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">Correo Electrónico Corporativo</label>
            <input type="email" id="recuperarEmail" placeholder="usuario@arauco.com" required value="${document.getElementById('loginEmail')?.value || 'diego.a.cristaldo@arauco.com'}" style="width: 100%; padding: 0.55rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff;">
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
            <button type="button" class="btn btn-outline" onclick="cerrarModalRecuperarPassword()">Cancelar</button>
            <button type="button" class="btn" style="background: var(--arauco-green-light);" onclick="solicitarCodigoRecuperacion()" id="btnSolicitarCodigo">
              Enviar Código PIN &rarr;
            </button>
          </div>
        </div>

        <!-- Paso 2: Validación de código y nueva clave -->
        <div id="recuperarPaso2" style="display: none;">
          <div style="background: rgba(82, 183, 136, 0.15); border: 1px dashed var(--arauco-accent); border-radius: 6px; padding: 0.65rem; margin-bottom: 1rem; font-size: 0.8rem; color: #d8f3dc;">
            Código enviado para: <strong id="recuperarTargetEmail"></strong>
            <div id="recuperarPinSimuladoBox" style="margin-top: 0.35rem; font-weight: bold; color: #86efac; font-size: 0.85rem;"></div>
          </div>
          <form onsubmit="handleRestablecerPasswordSubmit(event)">
            <div class="form-group" style="margin-bottom: 0.75rem;">
              <label style="font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">Código PIN de Verificación (6 dígitos)</label>
              <input type="text" id="recuperarCodigo" placeholder="Ej: 849201" maxlength="6" required style="width: 100%; padding: 0.55rem; font-family: monospace; font-size: 1.15rem; letter-spacing: 3px; text-align: center; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff;">
            </div>
            <div class="form-group" style="margin-bottom: 0.75rem;">
              <label style="font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">Nueva Contraseña (mínimo 4 caracteres)</label>
              <input type="password" id="recuperarNuevaPass" required minlength="4" style="width: 100%; padding: 0.55rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff;">
            </div>
            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label style="font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">Confirmar Nueva Contraseña</label>
              <input type="password" id="recuperarConfirmarPass" required minlength="4" style="width: 100%; padding: 0.55rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff;">
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <button type="button" class="btn btn-outline btn-sm" onclick="volverAPaso1Recuperacion()">← Volver</button>
              <button type="submit" class="btn" style="background: var(--arauco-green-light);" id="btnRestablecerPass">
                Restablecer Contraseña
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal para Cambiar Contraseña del Usuario Activo -->
    <div id="modalCambiarPassword" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 2000; align-items: center; justify-content: center; padding: 1rem;">
      <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; max-width: 420px; width: 100%; padding: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
          <h3 style="margin: 0; font-size: 1.1rem; color: #fff;">🔑 Cambiar Contraseña</h3>
          <button type="button" class="btn btn-outline btn-sm" onclick="cerrarModalCambiarPassword()">✖</button>
        </div>
        <form onsubmit="handleCambiarPasswordSubmit(event)">
          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label style="font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">Contraseña Actual</label>
            <input type="password" id="inputPassActual" required style="width: 100%; padding: 0.5rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff;">
          </div>
          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label style="font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">Nueva Contraseña (mínimo 4 caracteres)</label>
            <input type="password" id="inputPassNueva" required minlength="4" style="width: 100%; padding: 0.5rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff;">
          </div>
          <div class="form-group" style="margin-bottom: 1.25rem;">
            <label style="font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">Confirmar Nueva Contraseña</label>
            <input type="password" id="inputPassConfirmar" required minlength="4" style="width: 100%; padding: 0.5rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff;">
          </div>
          <div id="cambiarPassAlert" style="display: none; padding: 0.5rem; font-size: 0.8rem; border-radius: 4px; margin-bottom: 1rem;"></div>
          <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
            <button type="button" class="btn btn-outline" onclick="cerrarModalCambiarPassword()">Cancelar</button>
            <button type="submit" class="btn" style="background: var(--arauco-green-light);">Guardar Nueva Contraseña</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

window.seleccionarCuentaParaLogin = (email) => {
  const inputEmail = document.getElementById('loginEmail');
  const inputPass = document.getElementById('loginPassword');
  const alertBox = document.getElementById('loginErrorAlert');
  if (alertBox) alertBox.style.display = 'none';

  if (inputEmail) inputEmail.value = email;
  if (inputPass) {
    inputPass.value = '';
    inputPass.focus();
  }
};

window.autocompletarCredenciales = (email, pass) => {
  const inputEmail = document.getElementById('loginEmail');
  const inputPass = document.getElementById('loginPassword');
  const alertBox = document.getElementById('loginErrorAlert');
  if (alertBox) alertBox.style.display = 'none';

  if (inputEmail) inputEmail.value = email;
  if (inputPass) {
    inputPass.value = pass || 'Arauco!2026';
    inputPass.focus();
  }
};

window.ingresoDirectoPrueba = async (email, pass) => {
  autocompletarCredenciales(email, pass);
  const fakeEvent = { preventDefault: () => { } };
  await handleLoginSubmit(fakeEvent);
};

window.togglePasswordVisibility = () => {
  const passInput = document.getElementById('loginPassword');
  const icon = document.getElementById('passToggleIcon');
  if (!passInput) return;
  if (passInput.type === 'password') {
    passInput.type = 'text';
    if (icon) icon.textContent = '🙈 Ocultar';
  } else {
    passInput.type = 'password';
    if (icon) icon.textContent = '👁️ Mostrar';
  }
};

window.handleLoginSubmit = async (e) => {
  e.preventDefault();
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');
  const btnSubmit = document.getElementById('btnSubmitLogin');
  const alertBox = document.getElementById('loginErrorAlert');

  if (alertBox) alertBox.style.display = 'none';

  const email = (emailInput?.value || '').trim();
  const password = passInput?.value || '';

  if (!email || !password) {
    if (alertBox) {
      alertBox.textContent = '⚠️ Ingrese su correo electrónico y contraseña.';
      alertBox.style.display = 'block';
    }
    return;
  }

  const originalBtnText = btnSubmit.innerHTML;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '⏳ Verificando credenciales...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(r => r.json());

    if (res.ok && res.user) {
      AppState.currentUser = res.user;
      localStorage.setItem('andamios_session', JSON.stringify(res.user));
      actualizarUserBar();
      renderPortalPorRol();
    } else {
      if (alertBox) {
        alertBox.textContent = '❌ ' + (res.error || 'Credenciales inválidas. Compruebe usuario y contraseña.');
        alertBox.style.display = 'block';
      }
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalBtnText;
    }
  } catch (err) {
    console.error('Error login:', err);
    if (alertBox) {
      alertBox.textContent = '⚠️ No se pudo conectar con el servidor de autenticación.';
      alertBox.style.display = 'block';
    }
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = originalBtnText;
  }
};

/* ========================================================
   GESTIÓN DE REGISTRO DE NUEVOS USUARIOS
   ======================================================== */
window.cambiarAuthTab = (tab) => {
  const secLogin = document.getElementById('secLogin');
  const secRegistro = document.getElementById('secRegistro');
  const tabLogin = document.getElementById('tabBtnLogin');
  const tabReg = document.getElementById('tabBtnRegistro');

  if (tab === 'registro') {
    if (secLogin) secLogin.style.display = 'none';
    if (secRegistro) secRegistro.style.display = 'block';
    if (tabLogin) tabLogin.className = 'btn btn-outline';
    if (tabReg) tabReg.className = 'btn';
  } else {
    if (secLogin) secLogin.style.display = 'block';
    if (secRegistro) secRegistro.style.display = 'none';
    if (tabLogin) tabLogin.className = 'btn';
    if (tabReg) tabReg.className = 'btn btn-outline';
  }
};

window.actualizarCamposRegistro = (perfil) => {
  const bMto = document.getElementById('bloqueSolicitanteMto');
  const bProd = document.getElementById('bloqueSolicitanteProd');
  const bEess = document.getElementById('bloqueEjecutorEess');

  if (bMto) bMto.style.display = perfil === 'SOLICITANTE_MTO' ? 'block' : 'none';
  if (bProd) bProd.style.display = perfil === 'SOLICITANTE_PROD' ? 'block' : 'none';
  if (bEess) bEess.style.display = perfil === 'EJECUTOR_EESS' ? 'block' : 'none';
};

window.handleRegistroSubmit = async (e) => {
  e.preventDefault();
  const nombre = (document.getElementById('regNombre')?.value || '').trim();
  const email = (document.getElementById('regEmail')?.value || '').trim();
  const legajo = (document.getElementById('regLegajo')?.value || '').trim();
  const perfil = document.getElementById('regPerfil')?.value;
  const pass = document.getElementById('regPassword')?.value || '';
  const passConf = document.getElementById('regPasswordConfirm')?.value || '';

  const errBox = document.getElementById('regErrorAlert');
  const succBox = document.getElementById('regSuccessAlert');
  const btn = document.getElementById('btnSubmitRegistro');

  if (errBox) errBox.style.display = 'none';
  if (succBox) succBox.style.display = 'none';

  if (!nombre || !email || !perfil || !pass) {
    if (errBox) {
      errBox.textContent = '⚠️ Complete todos los campos obligatorios (*).';
      errBox.style.display = 'block';
    }
    return;
  }

  if (pass !== passConf) {
    if (errBox) {
      errBox.textContent = '⚠️ Las contraseñas ingresadas no coinciden.';
      errBox.style.display = 'block';
    }
    return;
  }

  if (pass.length < 4) {
    if (errBox) {
      errBox.textContent = '⚠️ La contraseña debe tener al menos 4 caracteres.';
      errBox.style.display = 'block';
    }
    return;
  }

  let sector = '';
  let centroCostos = '';
  let empresaNombre = '';
  let funcionObra = '';

  if (perfil === 'SOLICITANTE_MTO') {
    sector = document.getElementById('regSectorMto')?.value || 'Mantenimiento Mecánico';
    centroCostos = document.getElementById('regCcMto')?.value || 'CC-MTTO-01';
  } else if (perfil === 'SOLICITANTE_PROD') {
    sector = document.getElementById('regSectorProd')?.value || 'Producción';
    centroCostos = document.getElementById('regCcProd')?.value || 'CC-PROD-02';
  } else if (perfil === 'EJECUTOR_EESS') {
    empresaNombre = document.getElementById('regEmpresaEess')?.value || 'Andamios del Sur S.A.';
    funcionObra = document.getElementById('regFuncionEess')?.value || 'Supervisor de Montaje';
    sector = funcionObra;
  }

  const originalTxt = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Registrando cuenta...';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        email,
        legajo,
        perfil,
        password: pass,
        sector,
        centroCostos,
        empresaNombre,
        funcionObra
      })
    }).then(r => r.json());

    if (res.ok && res.user) {
      if (succBox) {
        succBox.textContent = res.mensaje || '¡Registro completado con éxito! Iniciando sesión...';
        succBox.style.display = 'block';
      }
      setTimeout(() => {
        AppState.currentUser = res.user;
        localStorage.setItem('andamios_session', JSON.stringify(res.user));
        actualizarUserBar();
        renderPortalPorRol();
      }, 700);
    } else {
      if (errBox) {
        errBox.textContent = '❌ ' + (res.error || 'No se pudo completar el registro.');
        errBox.style.display = 'block';
      }
      btn.disabled = false;
      btn.innerHTML = originalTxt;
    }
  } catch (err) {
    console.error('Error registro:', err);
    if (errBox) {
      errBox.textContent = '⚠️ Error de comunicación con el servidor.';
      errBox.style.display = 'block';
    }
    btn.disabled = false;
    btn.innerHTML = originalTxt;
  }
};

window.abrirModalCambiarPassword = () => {
  const modal = document.getElementById('modalCambiarPassword');
  const alertBox = document.getElementById('cambiarPassAlert');
  if (alertBox) alertBox.style.display = 'none';
  if (modal) {
    document.getElementById('inputPassActual').value = '';
    document.getElementById('inputPassNueva').value = '';
    document.getElementById('inputPassConfirmar').value = '';
    modal.style.display = 'flex';
  }
};

window.cerrarModalCambiarPassword = () => {
  const modal = document.getElementById('modalCambiarPassword');
  if (modal) modal.style.display = 'none';
};

window.handleCambiarPasswordSubmit = async (e) => {
  e.preventDefault();
  const passwordActual = document.getElementById('inputPassActual').value;
  const passwordNueva = document.getElementById('inputPassNueva').value;
  const passwordConfirmar = document.getElementById('inputPassConfirmar').value;
  const alertBox = document.getElementById('cambiarPassAlert');

  if (passwordNueva !== passwordConfirmar) {
    alertBox.textContent = '❌ La nueva contraseña y su confirmación no coinciden.';
    alertBox.style.background = 'rgba(239, 68, 68, 0.2)';
    alertBox.style.color = '#fca5a5';
    alertBox.style.display = 'block';
    return;
  }

  try {
    const res = await fetch('/api/auth/cambiar-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: AppState.currentUser.id,
        passwordActual,
        passwordNueva
      })
    }).then(r => r.json());

    if (res.ok) {
      alertBox.textContent = '✅ ' + res.mensaje;
      alertBox.style.background = 'rgba(16, 185, 129, 0.2)';
      alertBox.style.color = '#86efac';
      alertBox.style.display = 'block';
      setTimeout(() => {
        cerrarModalCambiarPassword();
      }, 1500);
    } else {
      alertBox.textContent = '❌ ' + (res.error || 'Error al cambiar contraseña');
      alertBox.style.background = 'rgba(239, 68, 68, 0.2)';
      alertBox.style.color = '#fca5a5';
      alertBox.style.display = 'block';
    }
  } catch (err) {
    alertBox.textContent = '⚠️ Error de comunicación con el servidor';
    alertBox.style.background = 'rgba(239, 68, 68, 0.2)';
    alertBox.style.color = '#fca5a5';
    alertBox.style.display = 'block';
  }
};

/* ========================================================
   SISTEMA DE RECUPERACIÓN DE CONTRASEÑA POR PIN
   ======================================================== */
window.abrirModalRecuperarPassword = () => {
  const modal = document.getElementById('modalRecuperarPassword');
  const alertBox = document.getElementById('recuperarAlerta');
  if (alertBox) alertBox.style.display = 'none';

  // Precargar el email ingresado en el login
  const loginEmail = document.getElementById('loginEmail')?.value || '';
  const inputEmail = document.getElementById('recuperarEmail');
  if (inputEmail && loginEmail) inputEmail.value = loginEmail;

  document.getElementById('recuperarPaso1').style.display = 'block';
  document.getElementById('recuperarPaso2').style.display = 'none';
  if (modal) modal.style.display = 'flex';
};

window.cerrarModalRecuperarPassword = () => {
  const modal = document.getElementById('modalRecuperarPassword');
  if (modal) modal.style.display = 'none';
};

window.volverAPaso1Recuperacion = () => {
  const alertBox = document.getElementById('recuperarAlerta');
  if (alertBox) alertBox.style.display = 'none';
  document.getElementById('recuperarPaso1').style.display = 'block';
  document.getElementById('recuperarPaso2').style.display = 'none';
};

window.solicitarCodigoRecuperacion = async () => {
  const emailInput = document.getElementById('recuperarEmail');
  const alertBox = document.getElementById('recuperarAlerta');
  const btn = document.getElementById('btnSolicitarCodigo');
  const email = (emailInput?.value || '').trim();

  if (!email) {
    if (alertBox) {
      alertBox.textContent = '⚠️ Por favor ingrese su correo electrónico corporativo.';
      alertBox.style.background = 'rgba(239, 68, 68, 0.2)';
      alertBox.style.color = '#fca5a5';
      alertBox.style.display = 'block';
    }
    return;
  }

  const origBtnText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Generando PIN...';

  try {
    const res = await fetch('/api/auth/solicitar-recuperacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    }).then(r => r.json());

    if (res.ok) {
      document.getElementById('recuperarPaso1').style.display = 'none';
      document.getElementById('recuperarPaso2').style.display = 'block';
      document.getElementById('recuperarTargetEmail').textContent = res.email;

      // Mostrar código en pantalla (simulación de email en entorno de prueba)
      if (res.codigoSimulado) {
        document.getElementById('recuperarPinSimuladoBox').innerHTML =
          'Notificación de Seguridad: Su código PIN generado es <span style="background: #1e293b; padding: 2px 8px; border-radius: 4px; letter-spacing: 2px; font-size: 1.1rem; border: 1px solid #52b788;">' +
          res.codigoSimulado + '</span>';
        document.getElementById('recuperarCodigo').value = res.codigoSimulado;
      }

      if (alertBox) {
        alertBox.textContent = '✅ ' + res.mensaje;
        alertBox.style.background = 'rgba(16, 185, 129, 0.2)';
        alertBox.style.color = '#86efac';
        alertBox.style.display = 'block';
      }
    } else {
      if (alertBox) {
        alertBox.textContent = '❌ ' + (res.error || 'No se pudo generar código para este correo.');
        alertBox.style.background = 'rgba(239, 68, 68, 0.2)';
        alertBox.style.color = '#fca5a5';
        alertBox.style.display = 'block';
      }
    }
  } catch (err) {
    if (alertBox) {
      alertBox.textContent = '⚠️ Error de comunicación con el servidor.';
      alertBox.style.background = 'rgba(239, 68, 68, 0.2)';
      alertBox.style.color = '#fca5a5';
      alertBox.style.display = 'block';
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = origBtnText;
  }
};

window.handleRestablecerPasswordSubmit = async (e) => {
  e.preventDefault();
  const email = (document.getElementById('recuperarEmail')?.value || '').trim();
  const codigo = (document.getElementById('recuperarCodigo')?.value || '').trim();
  const passwordNueva = document.getElementById('recuperarNuevaPass')?.value || '';
  const passwordConfirmar = document.getElementById('recuperarConfirmarPass')?.value || '';
  const alertBox = document.getElementById('recuperarAlerta');
  const btn = document.getElementById('btnRestablecerPass');

  if (passwordNueva !== passwordConfirmar) {
    if (alertBox) {
      alertBox.textContent = '❌ La nueva contraseña y su confirmación no coinciden.';
      alertBox.style.background = 'rgba(239, 68, 68, 0.2)';
      alertBox.style.color = '#fca5a5';
      alertBox.style.display = 'block';
    }
    return;
  }

  const origBtnText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Guardando nueva clave...';

  try {
    const res = await fetch('/api/auth/restablecer-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, codigo, passwordNueva })
    }).then(r => r.json());

    if (res.ok) {
      if (alertBox) {
        alertBox.textContent = '✅ ' + res.mensaje;
        alertBox.style.background = 'rgba(16, 185, 129, 0.2)';
        alertBox.style.color = '#86efac';
        alertBox.style.display = 'block';
      }

      // Pre-cargar en el login y limpiar password
      const loginEmailInput = document.getElementById('loginEmail');
      const loginPassInput = document.getElementById('loginPassword');
      if (loginEmailInput) loginEmailInput.value = email;
      if (loginPassInput) {
        loginPassInput.value = passwordNueva;
        loginPassInput.focus();
      }

      setTimeout(() => {
        cerrarModalRecuperarPassword();
        alert('🎉 ¡Contraseña restablecida exitosamente!\nYa puedes iniciar sesión con tu nueva contraseña.');
      }, 1200);
    } else {
      if (alertBox) {
        alertBox.textContent = '❌ ' + (res.error || 'Error al restablecer contraseña.');
        alertBox.style.background = 'rgba(239, 68, 68, 0.2)';
        alertBox.style.color = '#fca5a5';
        alertBox.style.display = 'block';
      }
    }
  } catch (err) {
    if (alertBox) {
      alertBox.textContent = '⚠️ Error de conexión con el servidor.';
      alertBox.style.background = 'rgba(239, 68, 68, 0.2)';
      alertBox.style.color = '#fca5a5';
      alertBox.style.display = 'block';
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = origBtnText;
  }
};

/* ========================================================
   ENRUTADOR POR ROL
   ======================================================== */
function renderPortalPorRol() {
  const container = document.getElementById('appContainer');
  if (!container) return;
  const user = AppState.currentUser;
  if (!user) {
    renderLogin();
    return;
  }

  if (user.rol === 'SOLICITANTE') {
    renderPortalSolicitante(container, user);
  } else if (user.rol === 'GESTIONADOR') {
    if (AppState.adminViewMode === 'SOLICITANTE') {
      renderPortalSolicitante(container, user);
    } else {
      renderPortalGestionador(container, user);
    }
  } else if (user.rol === 'EMPRESA_SERVICIO') {
    renderPortalEjecutante(container, user);
  }
}

/* ========================================================
   PORTAL DEL SOLICITANTE
   ======================================================== */
async function renderPortalSolicitante(container, user) {
  try {
    const [resSol, resMet] = await Promise.all([
      fetch(`/api/solicitudes?rol=SOLICITANTE&usuarioId=${user.id}`).then(r => r.json()),
      fetch(`/api/solicitudes/metricas-solicitante/${user.id}`).then(r => r.json())
    ]);

    if (resSol.ok) AppState.misSolicitudes = resSol.solicitudes;
    if (resMet.ok) AppState.metricasSolicitante = resMet.metricas;
  } catch (err) {
    console.error('Error cargando datos del solicitante:', err);
  }

  const met = AppState.metricasSolicitante || {
    totalPedidos: 0, anuales: 0, pgp: 0, activos: 0, enAlquiler: 0, paraDesarme: 0, totalM3Solicitado: 0, totalM2Solicitado: 0
  };

  container.innerHTML = `
    <div class="info-card dashboard-hero">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
        <div>
          <h2 style="margin: 0; font-size: 1.15rem; color: #fff;">👤 Portal del Solicitante</h2>
          <p style="color: var(--text-muted); font-size: 0.78rem; margin: 0.2rem 0 0 0;">
            Usuario: <strong>${user.nombre}</strong> | Sector: <strong>${user.sector || 'Planta'}</strong> | Legajo: <strong>${user.legajo || 'N/A'}</strong> | CC: <strong>${user.centroCostos || 'N/A'}</strong>
          </p>
        </div>
      </div>
      <div class="header-kpis-grid">
        <div class="calc-box-compact">
          <div class="calc-val" style="color: #3b82f6;">${met.totalPedidos}</div>
          <div class="calc-label">Total Pedidos</div>
        </div>
        <div class="calc-box-compact">
          <div class="calc-val" style="color: #38bdf8;">${met.totalM3Solicitado} m³</div>
          <div class="calc-label">Volumen Solicitado</div>
        </div>
        <div class="calc-box-compact">
          <div class="calc-val" style="color: #4ade80;">${met.totalM2Solicitado} m²</div>
          <div class="calc-label">Plataformas</div>
        </div>
        <div class="calc-box-compact">
          <div class="calc-val" style="color: #f59e0b;">${met.paraDesarme}</div>
          <div class="calc-label">Para Desarme</div>
        </div>
      </div>
    </div>

    <div class="tabs-nav">
      <button class="tab-btn ${AppState.activeTabSolicitante === 'anual' ? 'active' : ''}" onclick="cambiarTabSolicitante('anual')">
        📋 1. Solicitud Anual (Normal)
      </button>
      <button class="tab-btn ${AppState.activeTabSolicitante === 'pgp' ? 'active' : ''}" onclick="cambiarTabSolicitante('pgp')">
        📊 2. Parada General (Excel)
      </button>
      <button class="tab-btn ${AppState.activeTabSolicitante === 'historico' ? 'active' : ''}" onclick="cambiarTabSolicitante('historico')">
        📂 3. Histórico & Copiar (${AppState.misSolicitudes.length})
      </button>
    </div>

    <div id="tabContentSolicitante"></div>
  `;

  renderContenidoTabSolicitante();
}

window.cambiarTabSolicitante = (tab) => {
  AppState.activeTabSolicitante = tab;
  renderPortalPorRol();
};

function renderContenidoTabSolicitante() {
  const container = document.getElementById('tabContentSolicitante');
  if (!container) return;
  if (AppState.activeTabSolicitante === 'anual') renderFormularioAnual(container);
  else if (AppState.activeTabSolicitante === 'pgp') renderCargaMasivaPGP(container);
  else if (AppState.activeTabSolicitante === 'historico') renderHistoricoSolicitante(container);
}

function renderFormularioAnual(container, datosPrecargados = null) {
  const user = AppState.currentUser;
  const d = datosPrecargados || {};

  container.innerHTML = `
    <div class="info-card">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <div>
          <h3>SOLICITUD DE PROVISIÓN DE ANDAMIOS (ARAUCO)</h3>
          <p style="color: var(--text-muted); font-size: 0.8rem;">
            Planilla Oficial de Marcha Normal · Plazo estándar: 30 días corridos incluidos (luego pasa a Alquiler)
          </p>
        </div>
        <div>
          ${d.copiadoDe ? `<span class="status-badge programado">Clonado desde ${d.copiadoDe}</span>` : ''}
        </div>
      </div>

      <form id="formSolicitudAnual" onsubmit="enviarSolicitudAnual(event)">
        <div class="grid-2">
          <div class="form-group">
            <label>Sector Solicitante</label>
            <select id="sectorSolicitante" required>
              <option value="Mantenimiento" ${d.sectorSolicitante === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
              <option value="Producción" ${d.sectorSolicitante === 'Producción' ? 'selected' : ''}>Producción</option>
              <option value="Nuevo" ${d.sectorSolicitante === 'Nuevo' ? 'selected' : ''}>Nuevo</option>
              <option value="Alquiler" ${d.sectorSolicitante === 'Alquiler' ? 'selected' : ''}>Alquiler</option>
            </select>
          </div>

          <div class="form-group">
            <label>Oportunidad de Trabajo</label>
            <select id="oportunidadTrabajo" required>
              <option value="Marcha normal" selected>Marcha normal</option>
              <option value="Parada general">Parada general</option>
              <option value="Andamio adicional PGP">Andamio adicional PGP</option>
            </select>
          </div>
        </div>

        <div class="grid-3">
          <div class="form-group">
            <label>Solicitante</label>
            <input type="text" id="solicitanteNombre" value="${d.solicitanteNombre || user.nombre}" required>
          </div>
          <div class="form-group">
            <label>Legajo</label>
            <input type="text" id="legajo" value="${d.legajo || user.legajo || ''}" required>
          </div>
          <div class="form-group">
            <label>Sector</label>
            <input type="text" id="sector" value="${d.sector || user.sector || ''}" required>
          </div>
        </div>

        <div class="grid-3">
          <div class="form-group">
            <label>Puesto Tbjo. Resp. / Centro de Costos</label>
            <input type="text" id="centroCostos" value="${d.centroCostos || user.centroCostos || ''}" placeholder="Ej. CC-MTTO-01" required>
          </div>
          <div class="form-group">
            <label>Ubicación Técnica (Exacta en Planta)</label>
            <input type="text" id="ubicacionTecnica" value="${d.ubicacionTecnica || ''}" placeholder="Ej. Caldera Recuperación - Válvula V-204" required>
          </div>
          <div class="form-group">
            <label>Motivo del Trabajo</label>
            <input type="text" id="motivo" value="${d.motivo || ''}" placeholder="Ej. Reparación de línea de vapor / Aislación" required>
          </div>
        </div>

        <div class="form-group" style="margin-top: 0.5rem;">
          <label>Tipos de Andamios</label>
          <div class="checkbox-grid">
            <label class="checkbox-item"><input type="checkbox" name="tipoAndamio" value="Plataforma trabajo" checked> Plataforma trabajo</label>
            <label class="checkbox-item"><input type="checkbox" name="tipoAndamio" value="Colgante"> Colgante</label>
            <label class="checkbox-item"><input type="checkbox" name="tipoAndamio" value="Móvil"> Móvil</label>
            <label class="checkbox-item"><input type="checkbox" name="tipoAndamio" value="Baranda protección"> Baranda protección</label>
            <label class="checkbox-item"><input type="checkbox" name="tipoAndamio" value="Estructura protección"> Estructura protección</label>
            <label class="checkbox-item"><input type="checkbox" name="tipoAndamio" value="Estructura carpa"> Estructura carpa</label>
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label>Ítem Especial Calderas (CR / CP) - Si aplica</label>
            <select id="itemEspecialCaldera">
              <option value="NINGUNO" selected>Ninguno (Estándar)</option>
              <option value="PISO_INF_CR">Pisos de seguridad INF CR</option>
              <option value="PISO_SUP_CR">Pisos de seguridad SUP CR</option>
              <option value="PISO_CP">Pisos de seguridad CP</option>
              <option value="GRILLA_MOVIL_CP">Entablonado Grilla móvil CP</option>
            </select>
          </div>
          <div class="form-group">
            <label>Régimen Horario Estimado</label>
            <select id="regimenHorarioEstimado">
              <option value="HABILES" selected>Días hábiles (Jornada normal)</option>
              <option value="SABADO_NOCTURNO">Sábados y Nocturno</option>
              <option value="DOMINGO_FERIADO">Domingo y Feriado</option>
            </select>
          </div>
        </div>

        <div class="grid-2" style="background-color: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); margin: 1rem 0;">
          <div>
            <h4 style="color: var(--arauco-accent); margin-bottom: 0.5rem;">DIMENSIONES SOLICITADAS: ANDAMIO</h4>
            <div class="grid-3">
              <div class="form-group">
                <label>Ancho (m)</label>
                <input type="number" id="andAncho" step="0.01" min="0" value="${d.dimSolicitadaAndamio?.ancho || 2.0}" oninput="recalcularMetrajeSolicitado()">
              </div>
              <div class="form-group">
                <label>Largo (m)</label>
                <input type="number" id="andLargo" step="0.01" min="0" value="${d.dimSolicitadaAndamio?.largo || 3.0}" oninput="recalcularMetrajeSolicitado()">
              </div>
              <div class="form-group">
                <label>Alto (m)</label>
                <input type="number" id="andAlto" step="0.01" min="0" value="${d.dimSolicitadaAndamio?.alto || 4.0}" oninput="recalcularMetrajeSolicitado()">
              </div>
            </div>
            <div class="calc-box">
              <div class="calc-val" id="dispVolumenM3">24.00 m³</div>
              <div class="calc-label">Volumen Solicitado (m³)</div>
            </div>
          </div>

          <div>
            <h4 style="color: var(--arauco-accent); margin-bottom: 0.5rem;">DIMENSIONES SOLICITADAS: PLATAFORMA</h4>
            <div class="grid-3">
              <div class="form-group">
                <label>N° Plat.</label>
                <input type="number" id="platN" step="1" min="0" value="${d.dimSolicitadaPlataforma?.nPlat || 1}" oninput="recalcularMetrajeSolicitado()">
              </div>
              <div class="form-group">
                <label>Ancho (m)</label>
                <input type="number" id="platAncho" step="0.01" min="0" value="${d.dimSolicitadaPlataforma?.ancho || 2.0}" oninput="recalcularMetrajeSolicitado()">
              </div>
              <div class="form-group">
                <label>Largo (m)</label>
                <input type="number" id="platLargo" step="0.01" min="0" value="${d.dimSolicitadaPlataforma?.largo || 3.0}" oninput="recalcularMetrajeSolicitado()">
              </div>
            </div>
            <div class="calc-box">
              <div class="calc-val" id="dispSuperficieM2" style="color: #4ade80;">6.00 m²</div>
              <div class="calc-label">Superficie Solicitada (m²)</div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Observaciones Adicionales</label>
          <textarea id="observaciones" rows="2" placeholder="Indicaciones para el montaje o requerimientos de seguridad...">${d.observaciones || ''}</textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem;">
          <button type="button" class="btn btn-outline" onclick="cambiarTabSolicitante('historico')">Cancelar</button>
          <button type="submit" class="btn" style="padding: 0.75rem 1.5rem;">
            🚀 Emitir Solicitud Oficial ARAUCO
          </button>
        </div>
      </form>
    </div>
  `;

  recalcularMetrajeSolicitado();
}

window.recalcularMetrajeSolicitado = () => {
  const an = parseFloat(document.getElementById('andAncho')?.value || 0);
  const la = parseFloat(document.getElementById('andLargo')?.value || 0);
  const al = parseFloat(document.getElementById('andAlto')?.value || 0);
  const vol = (an * la * al).toFixed(2);
  const dispVol = document.getElementById('dispVolumenM3');
  if (dispVol) dispVol.textContent = `${vol} m³`;

  const pn = parseInt(document.getElementById('platN')?.value || 0);
  const pa = parseFloat(document.getElementById('platAncho')?.value || 0);
  const pl = parseFloat(document.getElementById('platLargo')?.value || 0);
  const sup = (pn * pa * pl).toFixed(2);
  const dispSup = document.getElementById('dispSuperficieM2');
  if (dispSup) dispSup.textContent = `${sup} m²`;
};

window.enviarSolicitudAnual = async (e) => {
  e.preventDefault();
  const user = AppState.currentUser;

  const checkboxes = document.querySelectorAll('input[name="tipoAndamio"]:checked');
  const tiposAndamio = Array.from(checkboxes).map(c => c.value);

  const payload = {
    tipoOperacion: 'ANUAL',
    sectorSolicitante: document.getElementById('sectorSolicitante').value,
    oportunidadTrabajo: document.getElementById('oportunidadTrabajo').value,
    solicitanteId: user.id,
    solicitanteNombre: document.getElementById('solicitanteNombre').value,
    legajo: document.getElementById('legajo').value,
    sector: document.getElementById('sector').value,
    centroCostos: document.getElementById('centroCostos').value,
    ubicacionTecnica: document.getElementById('ubicacionTecnica').value,
    motivo: document.getElementById('motivo').value,
    tiposAndamio,
    itemEspecialCaldera: document.getElementById('itemEspecialCaldera').value,
    regimenHorarioEstimado: document.getElementById('regimenHorarioEstimado').value,
    dimSolicitadaAndamio: {
      ancho: document.getElementById('andAncho').value,
      largo: document.getElementById('andLargo').value,
      alto: document.getElementById('andAlto').value
    },
    dimSolicitadaPlataforma: {
      nPlat: document.getElementById('platN').value,
      ancho: document.getElementById('platAncho').value,
      largo: document.getElementById('platLargo').value
    },
    observaciones: document.getElementById('observaciones').value
  };

  try {
    const res = await fetch('/api/solicitudes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.ok) {
      alert(`✅ Solicitud ${res.solicitud.numeroCorrelativo} creada con éxito.\nID de Tarjeta: ${res.solicitud.tarjetaId}\nEnviada al Gestionador para aprobación.`);
      cambiarTabSolicitante('historico');
    } else {
      alert('Error: ' + res.error);
    }
  } catch (err) {
    alert('Fallo de conexión al enviar la solicitud');
  }
};

function renderCargaMasivaPGP(container) {
  container.innerHTML = `
    <div class="info-card">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <div>
          <h3>📊 Carga Masiva de Andamios - Parada General de Planta (PGP)</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem;">
            Sube o pega tu planilla con múltiples andamios. El sistema calculará automáticamente los m³ y m² de cada fila y las métricas totales del lote.
          </p>
        </div>
        <div>
          <button class="btn btn-outline" onclick="descargarPlantillaCSV()">
            📥 Descargar Plantilla Modelo (.CSV)
          </button>
        </div>
      </div>

      <div class="grid-2">
        <div>
          <h4>Opción A: Pegar celdas directamente desde Excel</h4>
          <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0.3rem 0;">
            Copia filas de tu Excel (Columnas: Ubicación | Motivo | Ancho | Largo | Alto | N° Plat | Centro Costos) y pégalas aquí:
          </p>
          <textarea id="txtExcelPasted" rows="6" placeholder="Caldera Recuperación\tReparación Domo\t2.0\t3.0\t6.0\t2\tCC-MTTO-01&#10;Área Caustificación\tVálvula Bypass\t1.5\t2.0\t3.0\t1\tCC-MTTO-02"></textarea>
          <button class="btn" style="margin-top: 0.5rem;" onclick="procesarTextoPegado()">
            ⚙️ Previsualizar y Calcular Metraje
          </button>
        </div>

        <div>
          <h4>Opción B: Subir archivo (.CSV / .TXT delimitado)</h4>
          <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0.3rem 0;">
            Selecciona un archivo exportado de Excel:
          </p>
          <input type="file" id="fileCsvInput" accept=".csv, .txt" style="margin: 0.5rem 0;" onchange="handleArchivoSeleccionado(event)">
          <div style="background-color: var(--bg-dark); padding: 0.75rem; border-radius: 6px; font-size: 0.8rem; color: var(--text-muted);">
            💡 Las métricas de recepción (cantidad de andamios, suma de m³ y suma de m²) se enviarán agrupadas bajo un código de lote PGP al Gestionador.
          </div>
        </div>
      </div>

      <div id="mesaPrevisualizacion" style="margin-top: 1.5rem; display: none;"></div>
    </div>
  `;
}

window.descargarPlantillaCSV = () => {
  const encabezado = "UbicacionTecnica,Motivo,AnchoAndamio,LargoAndamio,AltoAndamio,CantidadPlataformas,CentroCostos,Observaciones\n";
  const filasEjemplo =
    "Caldera Recuperación - Nivel +15m,Inspección Domo Superior,2.0,3.0,6.0,2,CC-PGP-01,Requiere doble baranda\n" +
    "Área Digestor - Válvula V-102,Cambio de sello de vapor,1.5,2.0,3.5,1,CC-PGP-02,Andamio con ruedas\n" +
    "Línea de Fibra - Bomba B-401,Alineación y pintura,2.0,2.0,2.5,1,CC-PGP-03,Marcha normal";

  const blob = new Blob([encabezado + filasEjemplo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "Plantilla_Andamios_PGP_ARAUCO.csv";
  a.click();
  URL.revokeObjectURL(url);
};

window.handleArchivoSeleccionado = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    procesarContenidoPlanilla(e.target.result);
  };
  reader.readAsText(file);
};

window.procesarTextoPegado = () => {
  const text = document.getElementById('txtExcelPasted')?.value || '';
  if (!text.trim()) {
    alert('Por favor pega texto o filas de Excel');
    return;
  }
  procesarContenidoPlanilla(text);
};

function procesarContenidoPlanilla(text) {
  const lineas = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lineas.length === 0) return;

  const primera = lineas[0];
  const delim = primera.includes('\t') ? '\t' : (primera.includes(';') ? ';' : ',');

  const pedidosParseados = [];
  let sumVolM3 = 0;
  let sumSupM2 = 0;

  const inicio = (primera.toLowerCase().includes('ubicacion') || primera.toLowerCase().includes('ancho')) ? 1 : 0;

  for (let i = inicio; i < lineas.length; i++) {
    const cols = lineas[i].split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 5) continue;

    const ubicacion = cols[0] || `Sector PGP #${i}`;
    const motivo = cols[1] || 'Parada General';
    const ancho = parseFloat(cols[2] || 2.0);
    const largo = parseFloat(cols[3] || 2.0);
    const alto = parseFloat(cols[4] || 2.0);
    const nPlat = parseInt(cols[5] || 1);
    const cc = cols[6] || AppState.currentUser.centroCostos || 'CC-PGP';
    const obs = cols[7] || '';

    const volM3 = parseFloat((ancho * largo * alto).toFixed(2));
    const supM2 = parseFloat((nPlat * ancho * largo).toFixed(2));

    sumVolM3 += volM3;
    sumSupM2 += supM2;

    pedidosParseados.push({
      itemNum: i + 1 - inicio,
      ubicacionTecnica: ubicacion,
      motivo,
      anchoAndamio: ancho,
      largoAndamio: largo,
      altoAndamio: alto,
      volumenM3: volM3,
      nPlat,
      superficieM2: supM2,
      centroCostos: cc,
      observaciones: obs
    });
  }

  if (pedidosParseados.length === 0) {
    alert('No se pudieron interpretar filas válidas. Revisa el formato.');
    return;
  }

  AppState.datosLotePrevisualizado = {
    pedidos: pedidosParseados,
    totalAndamios: pedidosParseados.length,
    totalVolumenM3: parseFloat(sumVolM3.toFixed(2)),
    totalSuperficieM2: parseFloat(sumSupM2.toFixed(2))
  };

  mostrarMesaPrevisualizacion();
}

function mostrarMesaPrevisualizacion() {
  const mesa = document.getElementById('mesaPrevisualizacion');
  const d = AppState.datosLotePrevisualizado;
  if (!d) return;

  mesa.style.display = 'block';
  mesa.innerHTML = `
    <div style="background-color: rgba(27, 67, 50, 0.2); border: 1px solid var(--arauco-accent); padding: 1rem; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h4 style="color: var(--arauco-accent);">MÉTRICAS DE RECEPCIÓN DEL LOTE (PREVISUALIZACIÓN)</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem;">
            Verifica el metraje calculado automáticamente antes de confirmar el envío al Gestionador
          </p>
        </div>
        <div class="grid-3" style="gap: 1rem;">
          <div class="calc-box">
            <div class="calc-val">${d.totalAndamios}</div>
            <div class="calc-label">Total Andamios</div>
          </div>
          <div class="calc-box">
            <div class="calc-val" style="color: #38bdf8;">${d.totalVolumenM3} m³</div>
            <div class="calc-label">Volumen Total</div>
          </div>
          <div class="calc-box">
            <div class="calc-val" style="color: #4ade80;">${d.totalSuperficieM2} m²</div>
            <div class="calc-label">Plataformas Total</div>
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Ubicación Técnica</th>
              <th>Motivo</th>
              <th>Dimensiones Andamio (m)</th>
              <th>Volumen (m³)</th>
              <th>Plat. (cant.)</th>
              <th>Superficie (m²)</th>
              <th>Centro Costos</th>
            </tr>
          </thead>
          <tbody>
            ${d.pedidos.map(p => `
              <tr>
                <td><strong>${p.itemNum}</strong></td>
                <td>${p.ubicacionTecnica}</td>
                <td>${p.motivo}</td>
                <td>${p.anchoAndamio}m × ${p.largoAndamio}m × ${p.altoAndamio}m</td>
                <td style="color: #38bdf8; font-weight: 700;">${p.volumenM3} m³</td>
                <td>${p.nPlat}</td>
                <td style="color: #4ade80; font-weight: 700;">${p.superficieM2} m²</td>
                <td>${p.centroCostos}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.25rem;">
        <button class="btn btn-outline" onclick="document.getElementById('mesaPrevisualizacion').style.display='none'">
          Descartar Lote
        </button>
        <button class="btn" style="padding: 0.75rem 1.5rem;" onclick="confirmarImportacionLotePGP()">
          🚀 Confirmar y Enviar ${d.totalAndamios} Pedidos al Gestionador
        </button>
      </div>
    </div>
  `;
}

window.confirmarImportacionLotePGP = async () => {
  const d = AppState.datosLotePrevisualizado;
  if (!d) return;

  const user = AppState.currentUser;
  const payload = {
    pedidos: d.pedidos,
    solicitanteId: user.id,
    solicitanteNombre: user.nombre,
    sector: user.sector,
    centroCostos: user.centroCostos,
    legajo: user.legajo
  };

  try {
    const res = await fetch('/api/solicitudes/carga-masiva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.ok) {
      alert(`✅ Lote ${res.loteId} creado con éxito.\nTotal de andamios: ${res.totalPedidos}\nVolumen: ${res.metricasRecepcion.totalVolumenM3} m³\nSuperficie: ${res.metricasRecepcion.totalSuperficieM2} m².\nEnviado al Gestionador para programación.`);
      AppState.datosLotePrevisualizado = null;
      cambiarTabSolicitante('historico');
    } else {
      alert('Error en importación: ' + res.error);
    }
  } catch (err) {
    alert('Fallo de conexión al importar el lote masivo');
  }
};

function renderHistoricoSolicitante(container) {
  const list = AppState.misSolicitudes;

  container.innerHTML = `
    <div class="info-card">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <h3>📂 Registro Histórico de Solicitudes y Reutilización</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem;">
            Consulta el estado de tus andamios, solicita desarmes o reutiliza pedidos antiguos con un solo clic.
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <input type="text" id="filtroHistorico" placeholder="Buscar por N°, ubicación o motivo..." style="width: 280px;" oninput="filtrarTablaHistorico()">
        </div>
      </div>

      ${list.length === 0 ? `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No posees pedidos registrados aún. Crea uno nuevo o sube una planilla PGP.
        </div>
      ` : `
        <div class="table-responsive">
          <table id="tablaHistorico">
            <thead>
              <tr>
                <th>N° Solicitud / Tarjeta</th>
                <th>Tipo</th>
                <th>Ubicación Técnica</th>
                <th>Motivo</th>
                <th>Volumen / Sup. Solicitada</th>
                <th>Estado</th>
                <th>Regla 30 Días</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(s => {
    const vol = s.dimSolicitadaAndamio?.volumenM3 || 0;
    const sup = s.dimSolicitadaPlataforma?.superficieM2 || 0;
    return `
                  <tr>
                    <td>
                      <strong>${s.numeroCorrelativo}</strong><br>
                      <small style="color: var(--arauco-accent);">${s.tarjetaId}</small>
                    </td>
                    <td>
                      <span class="status-badge ${s.tipoOperacion === 'ANUAL' ? 'solicitado' : 'programado'}">
                        ${s.tipoOperacion === 'ANUAL' ? 'ANUAL' : 'PGP'}
                      </span>
                    </td>
                    <td><strong>${s.ubicacionTecnica}</strong></td>
                    <td>${s.motivo}</td>
                    <td>
                      <span style="color: #38bdf8;">${vol} m³</span> · 
                      <span style="color: #4ade80;">${sup} m²</span>
                    </td>
                    <td>
                      <span class="status-badge ${s.estado.toLowerCase()}">
                        ${s.estado}
                      </span>
                    </td>
                    <td>
                      ${s.tipoOperacion === 'ANUAL' && ['HABILITADO', 'EN_ALQUILER'].includes(s.estado) ? `
                        <span style="color: ${s.estado === 'EN_ALQUILER' ? '#ef4444' : '#f59e0b'}; font-weight: 700;">
                          ${s.estado === 'EN_ALQUILER' ? 'EN ALQUILER' : `Día ${s.diasPermanencia || 1} de 30`}
                        </span>
                      ` : '<span style="color: var(--text-muted);">-</span>'}
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                        <button class="btn btn-outline btn-sm" onclick="imprimirPlanillaOficialARAUCO('${s.id}')" title="Ver e imprimir planilla oficial ARAUCO">
                          📄 Planilla
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="copiarPedidoAntiguo('${s.id}')" title="Clonar dimensiones y ubicación">
                          📋 Copiar Pedido
                        </button>
                        ${['HABILITADO', 'EN_ALQUILER'].includes(s.estado) ? `
                          <button class="btn btn-outline btn-sm" onclick="imprimirTarjetaHabilitacionPorId('${s.id}')" title="Ver tarjeta QR">
                            🏷️ QR
                          </button>
                          <button class="btn btn-outline btn-sm" onclick="window.open('/verificar.html?id=' + encodeURIComponent('${s.numeroCorrelativo}'), '_blank')" title="Ver ficha técnica QR">
                            🌐 Ficha
                          </button>
                          <button class="btn btn-outline btn-sm" onclick="abrirModalSolicitarReforma('${s.id}')" title="Solicitar reforma o ampliación">
                            ➕ Reforma
                          </button>
                          <button class="btn btn-danger btn-sm" onclick="solicitarDesarme('${s.id}')">
                            🚩 Pedir Desarme
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
  }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

window.filtrarTablaHistorico = () => {
  const query = document.getElementById('filtroHistorico')?.value.toLowerCase() || '';
  const filas = document.querySelectorAll('#tablaHistorico tbody tr');
  filas.forEach(f => {
    f.style.display = f.textContent.toLowerCase().includes(query) ? '' : 'none';
  });
};

window.copiarPedidoAntiguo = (solicitudId) => {
  const sol = AppState.misSolicitudes.find(s => s.id === solicitudId);
  if (!sol) return;

  const datosClonados = {
    copiadoDe: sol.numeroCorrelativo,
    sectorSolicitante: sol.sectorSolicitante,
    solicitanteNombre: sol.solicitanteNombre,
    legajo: sol.legajo,
    sector: sol.sector,
    centroCostos: sol.centroCostos,
    ubicacionTecnica: sol.ubicacionTecnica,
    motivo: `(Reutilizado) ${sol.motivo}`,
    dimSolicitadaAndamio: sol.dimSolicitadaAndamio,
    dimSolicitadaPlataforma: sol.dimSolicitadaPlataforma,
    observaciones: sol.observaciones
  };

  AppState.activeTabSolicitante = 'anual';
  const container = document.getElementById('tabContentSolicitante');
  renderFormularioAnual(container, datosClonados);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.solicitarDesarme = async (solicitudId) => {
  if (!confirm('¿Confirmas que la tarea finalizó y el andamio está listo para desarme? Esta acción alerta de inmediato al Gestionador.')) {
    return;
  }

  try {
    const res = await fetch(`/api/solicitudes/${solicitudId}/solicitar-desarme`, {
      method: 'POST'
    }).then(r => r.json());

    if (res.ok) {
      alert(`✅ Aviso de desarme enviado para el andamio ${res.solicitud.numeroCorrelativo}.\nEl Gestionador asignará al equipo de desarme.`);
      renderPortalPorRol();
    } else {
      alert('Error: ' + res.error);
    }
  } catch (err) {
    alert('Fallo de conexión al solicitar desarme');
  }
};

/* ========================================================
   PORTAL DEL GESTIONADOR DE ANDAMIOS (ADMIN ARAUCO)
   ======================================================== */
async function renderPortalGestionador(container, user) {
  try {
    const [resSol, resMet] = await Promise.all([
      fetch('/api/solicitudes').then(r => r.json()),
      fetch('/api/gestionador/metricas').then(r => r.json())
    ]);

    if (resSol.ok) AppState.todasSolicitudesGestionador = resSol.solicitudes;
    if (resMet.ok) AppState.metricasGestionador = resMet.metricas;
  } catch (err) {
    console.error('Error cargando datos del gestionador:', err);
  }

  const m = AppState.metricasGestionador || {
    total: 0, solicitados: 0, programados: 0, activosPlanta: 0, enAlquiler: 0, desarmesPendientes: 0, m3ActivosPlanta: 0, m2ActivosPlanta: 0
  };

  const todas = AppState.todasSolicitudesGestionador || [];
  const deshabilitadosHSECount = todas.filter(s => s.estado === 'DESHABILITADO_HSE').length;
  const esHSE = (user.email === 'auditor.hse@arauco.com') || (user.sector && user.sector.includes('HSE'));

  if (esHSE && (!AppState.activeTabGestionador || AppState.activeTabGestionador === 'semanal')) {
    AppState.activeTabGestionador = 'auditoria';
  }

  const tituloPortal = esHSE ? '🦺 Centro de Control de Seguridad & Higiene (HSE)' : '🛡️ Centro de Control del Gestionador';
  const badgeRol = esHSE ? 'Seguridad HSE ARAUCO' : 'Admin ARAUCO';
  const subTituloPortal = esHSE ?
    `Auditor HSE: <strong>${user.nombre}</strong> | Inspección en Terreno & Control de Condiciones Seguras de Andamios` :
    `Supervisor: <strong>${user.nombre}</strong> | Planta Industrial ARAUCO | Control de Metraje & Certificación`;

  container.innerHTML = `
    <div class="info-card dashboard-hero">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
        <div>
          <h2 style="margin: 0; font-size: 1.15rem; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
            ${tituloPortal}
            <span style="font-size: 0.72rem; background: ${esHSE ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.15)'}; color: ${esHSE ? '#fca5a5' : '#38bdf8'}; border: 1px solid ${esHSE ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.3)'}; padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 600;">${badgeRol}</span>
          </h2>
          <p style="color: var(--text-muted); font-size: 0.78rem; margin: 0.2rem 0 0 0;">
            ${subTituloPortal}
          </p>
        </div>
      </div>

      <!-- Métricas abajo en 4 columnas completas (diseño solicitado) -->
      <div class="header-kpis-grid">
        <div class="calc-box-compact">
          <div class="calc-val" style="color: #3b82f6;">${m.solicitados}</div>
          <div class="calc-label">Nuevos Pedidos</div>
        </div>
        <div class="calc-box-compact">
          <div class="calc-val" style="color: #10b981;">${m.activosPlanta}</div>
          <div class="calc-label">Activos en Planta</div>
        </div>
        <div class="calc-box-compact">
          <div class="calc-val" style="color: ${deshabilitadosHSECount > 0 ? '#ef4444' : '#64748b'}; font-weight: 900;">${deshabilitadosHSECount}</div>
          <div class="calc-label" style="color: ${deshabilitadosHSECount > 0 ? '#fca5a5' : 'var(--text-muted)'};">Deshabilitados HSE ⛔</div>
        </div>
        <div class="calc-box-compact">
          <div class="calc-val" style="color: #f59e0b;">${m.desarmesPendientes}</div>
          <div class="calc-label">Desarmes Pendientes</div>
        </div>
      </div>
    </div>

    <div class="tabs-nav">
      <button class="tab-btn ${AppState.activeTabGestionador === 'semanal' ? 'active' : ''}" onclick="cambiarTabGestionador('semanal')" style="border-left: 3px solid #38bdf8; font-weight: 700;">
        📅 Vista Semanal
      </button>
      <button class="tab-btn ${AppState.activeTabGestionador === 'bandeja' ? 'active' : ''}" onclick="cambiarTabGestionador('bandeja')">
        📥 1. Bandeja (${m.solicitados + m.programados})
      </button>
      <button class="tab-btn ${AppState.activeTabGestionador === 'parque' ? 'active' : ''}" onclick="cambiarTabGestionador('parque')">
        🏗️ 2. Parque Activo (${m.activosPlanta})
      </button>
      <button class="tab-btn ${AppState.activeTabGestionador === 'desarmes' ? 'active' : ''}" onclick="cambiarTabGestionador('desarmes')">
        🚩 3. Desarmes (${m.desarmesPendientes})
      </button>
      <button class="tab-btn ${AppState.activeTabGestionador === 'certificacion' ? 'active' : ''}" onclick="cambiarTabGestionador('certificacion')">
        📑 4. Certificación
      </button>
      <button class="tab-btn ${AppState.activeTabGestionador === 'auditoria' ? 'active' : ''}" onclick="cambiarTabGestionador('auditoria')" style="${deshabilitadosHSECount > 0 ? 'border-bottom: 2px solid #ef4444; color: #f87171;' : ''}">
        🦺 5. Seg. & Higiene ${deshabilitadosHSECount > 0 ? `<span style="background: #ef4444; color: #fff; padding: 1px 6px; border-radius: 10px; font-size: 0.72rem; font-weight: 800;">${deshabilitadosHSECount} ⚠️</span>` : ''}
      </button>
      <button class="tab-btn ${AppState.activeTabGestionador === 'kpis' ? 'active' : ''}" onclick="cambiarTabGestionador('kpis')">
        📈 6. Métricas (${m.m3ActivosPlanta} m³)
      </button>
      <button class="tab-btn ${AppState.activeTabGestionador === 'solicitar' ? 'active' : ''}" onclick="cambiarTabGestionador('solicitar')">
        ➕ 7. Solicitar (Admin)
      </button>
    </div>

    <div id="tabContentGestionador"></div>
  `;

  const subContainer = document.getElementById('tabContentGestionador');
  if (AppState.activeTabGestionador === 'semanal') renderVistaSemanalGestionador(subContainer);
  else if (AppState.activeTabGestionador === 'bandeja') renderBandejaGestionador(subContainer);
  else if (AppState.activeTabGestionador === 'parque') renderParqueActivoGestionador(subContainer);
  else if (AppState.activeTabGestionador === 'desarmes') renderDesarmesGestionador(subContainer);
  else if (AppState.activeTabGestionador === 'certificacion') renderCertificacionGestionador(subContainer);
  else if (AppState.activeTabGestionador === 'auditoria') renderAuditoriaGestionador(subContainer);
  else if (AppState.activeTabGestionador === 'kpis') renderKPIsGestionador(subContainer);
  else if (AppState.activeTabGestionador === 'solicitar') renderSolicitarComoAdmin(subContainer, user);
}

window.cambiarTabGestionador = (tab) => {
  AppState.activeTabGestionador = tab;
  renderPortalPorRol();
};

/* ========================================================
   VISTA SEMANAL OPERATIVA (MIÉRCOLES A MARTES) - GESTIONADOR
   ======================================================== */
function obtenerSemanaMiercolesMartes(offsetSemanas = 0) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diaSemana = hoy.getDay(); // 0: Dom, 1: Lun, 2: Mar, 3: Mié, 4: Jue, 5: Vie, 6: Sáb
  const diffDias = diaSemana >= 3 ? diaSemana - 3 : diaSemana + 4;

  const miercolesInicio = new Date(hoy);
  miercolesInicio.setDate(hoy.getDate() - diffDias + (offsetSemanas * 7));
  miercolesInicio.setHours(0, 0, 0, 0);

  const martesFin = new Date(miercolesInicio);
  martesFin.setDate(miercolesInicio.getDate() + 6);
  martesFin.setHours(23, 59, 59, 999);

  const dias = [];
  const nombres = ['Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo', 'Lunes', 'Martes'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(miercolesInicio);
    d.setDate(miercolesInicio.getDate() + i);
    const dStr = d.toISOString().split('T')[0];
    const hoyStr = hoy.toISOString().split('T')[0];
    dias.push({
      fechaObj: d,
      fechaStr: dStr,
      nombreDia: nombres[i],
      diaNum: d.getDate(),
      mesNum: d.getMonth() + 1,
      anioNum: d.getFullYear(),
      esHoy: dStr === hoyStr,
      esFinDeSemana: i === 3 || i === 4
    });
  }

  return {
    miercolesInicio,
    martesFin,
    fechaInicioStr: miercolesInicio.toISOString().split('T')[0],
    fechaFinStr: martesFin.toISOString().split('T')[0],
    dias,
    esSemanaActual: offsetSemanas === 0
  };
}

function renderVistaSemanalGestionador(container) {
  if (typeof AppState.semanaOffset === 'undefined') AppState.semanaOffset = 0;
  if (typeof AppState.filtroEmpresaSemanal === 'undefined') AppState.filtroEmpresaSemanal = 'TODAS';
  if (typeof AppState.filtroEventoSemanal === 'undefined') AppState.filtroEventoSemanal = 'TODOS';
  if (typeof AppState.subTabSemanal === 'undefined') AppState.subTabSemanal = 'tablero';
  if (typeof AppState.busquedaSemanal === 'undefined') AppState.busquedaSemanal = '';

  const semana = obtenerSemanaMiercolesMartes(AppState.semanaOffset);
  const todas = AppState.todasSolicitudesGestionador || [];

  // Filtrado general por empresa y texto
  const solicitudesFiltradas = todas.filter(s => {
    if (AppState.filtroEmpresaSemanal !== 'TODAS' && s.proveedorAsignado !== AppState.filtroEmpresaSemanal) {
      return false;
    }
    if (AppState.busquedaSemanal) {
      const q = AppState.busquedaSemanal.toLowerCase();
      const txt = `${s.numeroCorrelativo} ${s.tarjetaId} ${s.ubicacionTecnica} ${s.sector} ${s.solicitanteNombre}`.toLowerCase();
      if (!txt.includes(q)) return false;
    }
    return true;
  });

  // Mapear eventos por día (Miércoles a Martes)
  const eventosPorDia = semana.dias.map(dia => {
    const eventos = [];
    solicitudesFiltradas.forEach(s => {
      const vol = s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0;
      const sup = s.totalSuperficieRealM2 || s.dimSolicitadaPlataforma?.superficieM2 || 0;

      // 1. Montaje Programado
      if (s.fechaProgramada === dia.fechaStr && (!AppState.filtroEventoSemanal || AppState.filtroEventoSemanal === 'TODOS' || AppState.filtroEventoSemanal === 'PROGRAMADO')) {
        eventos.push({
          tipo: 'PROGRAMADO',
          tipoLabel: '🔵 Montaje Programado',
          clase: 'montaje',
          solicitud: s,
          vol, sup
        });
      }

      // 2. Habilitación Realizada
      if (s.fechaArmado && s.fechaArmado.split('T')[0] === dia.fechaStr && (!AppState.filtroEventoSemanal || AppState.filtroEventoSemanal === 'TODOS' || AppState.filtroEventoSemanal === 'HABILITADO')) {
        eventos.push({
          tipo: 'HABILITADO',
          tipoLabel: '🟢 Habilitado en Sitio',
          clase: 'habilitado',
          solicitud: s,
          vol, sup
        });
      }

      // 3. Desarme Solicitado o Ejecutado
      const fechaDesarme = (s.fechaDesarmado && s.fechaDesarmado.split('T')[0]) || (s.fechaSolicitudDesarme && s.fechaSolicitudDesarme.split('T')[0]);
      if (fechaDesarme === dia.fechaStr && (!AppState.filtroEventoSemanal || AppState.filtroEventoSemanal === 'TODOS' || AppState.filtroEventoSemanal === 'DESARME')) {
        eventos.push({
          tipo: 'DESARME',
          tipoLabel: s.estado === 'DESARMADO' ? '⚪ Desarme Finalizado' : '🔴 Desarme Solicitado',
          clase: 'desarme',
          solicitud: s,
          vol, sup
        });
      }

      // 4. Vencimiento de 30 días
      if (s.fechaLimite30Dias && s.fechaLimite30Dias.split('T')[0] === dia.fechaStr && (!AppState.filtroEventoSemanal || AppState.filtroEventoSemanal === 'TODOS' || AppState.filtroEventoSemanal === 'ALQUILER')) {
        eventos.push({
          tipo: 'ALQUILER',
          tipoLabel: '🟡 Vence Plazo 30 Días',
          clase: 'alquiler',
          solicitud: s,
          vol, sup
        });
      }
    });

    return {
      dia,
      eventos
    };
  });

  // Andamios activos en planta durante esta semana operativa
  const andamiosActivosSemana = solicitudesFiltradas.filter(s => {
    if (!s.fechaArmado) return false;
    const fArm = s.fechaArmado.split('T')[0];
    const fDes = s.fechaDesarmado ? s.fechaDesarmado.split('T')[0] : null;

    const inicioArmado = fArm <= semana.fechaFinStr;
    const noDesarmadoAntes = !fDes || fDes >= semana.fechaInicioStr;
    return inicioArmado && noDesarmadoAntes;
  });

  // Cálculo de KPIs de la semana
  let totalEventosSemana = 0;
  eventosPorDia.forEach(epd => totalEventosSemana += epd.eventos.length);

  let m3TotalActivoSemana = 0;
  let m2TotalActivoSemana = 0;
  andamiosActivosSemana.forEach(s => {
    m3TotalActivoSemana += (s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0);
    m2TotalActivoSemana += (s.totalSuperficieRealM2 || s.dimSolicitadaPlataforma?.superficieM2 || 0);
  });

  const andamiosEnAlquilerSemana = andamiosActivosSemana.filter(s => s.estado === 'EN_ALQUILER' || (s.diasPermanencia && s.diasPermanencia > 30));
  const desarmesSemana = andamiosActivosSemana.filter(s => ['DESARME_SOLICITADO', 'DESARMADO'].includes(s.estado));

  // Formato de fechas para el encabezado
  const fIniParts = semana.fechaInicioStr.split('-');
  const fFinParts = semana.fechaFinStr.split('-');
  const rangoTexto = `Miércoles ${fIniParts[2]}/${fIniParts[1]} al Martes ${fFinParts[2]}/${fFinParts[1]}/${fFinParts[0]}`;

  const badgeEstadoSemana = AppState.semanaOffset === 0 ?
    `<span class="status-badge activo" style="font-size: 0.75rem;">SEMANA OPERATIVA EN CURSO</span>` :
    AppState.semanaOffset === -1 ?
    `<span class="status-badge programado" style="font-size: 0.75rem;">SEMANA ANTERIOR</span>` :
    AppState.semanaOffset === 1 ?
    `<span class="status-badge solicitado" style="font-size: 0.75rem;">PRÓXIMA SEMANA</span>` :
    `<span class="status-badge" style="background: rgba(255,255,255,0.1); color: #fff; font-size: 0.75rem;">SEMANA OFFSET (${AppState.semanaOffset > 0 ? '+' : ''}${AppState.semanaOffset})</span>`;

  container.innerHTML = `
    <!-- Barra Superior y Métricas de la Semana Operativa en Tarjeta Única -->
    <div class="info-card" style="margin-bottom: 0.65rem; padding: 0.6rem 0.85rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <h3 style="margin: 0; font-size: 1.1rem; color: #fff;">📅 Vista Semanal Operativa (Miércoles a Martes)</h3>
            ${badgeEstadoSemana}
          </div>
          <p style="color: var(--text-muted); font-size: 0.78rem; margin: 0.15rem 0 0 0;">
            Ciclo Oficial ARAUCO: <strong>${rangoTexto}</strong> · Programación & Vencimientos
          </p>
        </div>

        <!-- Controles de Navegación Temporal -->
        <div style="display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap;">
          <button class="btn btn-outline btn-sm" onclick="navegarSemana(-1)" title="Semana anterior" style="padding: 0.2rem 0.45rem; font-size: 0.78rem;">
            ◀ Anterior
          </button>
          <button class="btn btn-sm ${AppState.semanaOffset === 0 ? 'btn-outline' : ''}" style="${AppState.semanaOffset === 0 ? 'border-color: #10b981; color: #10b981;' : 'background: #10b981; color: #fff;'} padding: 0.2rem 0.45rem; font-size: 0.78rem;" onclick="irSemanaActual()" title="Semana actual">
            🔄 Actual
          </button>
          <button class="btn btn-outline btn-sm" onclick="navegarSemana(1)" title="Próxima semana" style="padding: 0.2rem 0.45rem; font-size: 0.78rem;">
            Siguiente ▶
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.print()" style="margin-left: 0.2rem; padding: 0.2rem 0.45rem; font-size: 0.78rem;" title="Imprimir programa">
            🖨️
          </button>
        </div>
      </div>

      <!-- Filtros Rápidos de la Semana -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.45rem; padding-top: 0.45rem; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 0.4rem;">
        <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
          <label style="font-size: 0.76rem; font-weight: 600; color: var(--text-muted); margin: 0;">Empresa:</label>
          <select id="filtroEmpresaSemanal" style="padding: 0.2rem 0.45rem; font-size: 0.76rem; width: auto;" onchange="cambiarFiltroEmpresaSemanal(this.value)">
            <option value="TODAS" ${AppState.filtroEmpresaSemanal === 'TODAS' ? 'selected' : ''}>Todas las Empresas</option>
            <option value="Andamios del Sur S.A." ${AppState.filtroEmpresaSemanal === 'Andamios del Sur S.A.' ? 'selected' : ''}>Andamios del Sur S.A.</option>
            <option value="Montajes Industriales S.A." ${AppState.filtroEmpresaSemanal === 'Montajes Industriales S.A.' ? 'selected' : ''}>Montajes Industriales S.A.</option>
          </select>

          <label style="font-size: 0.76rem; font-weight: 600; color: var(--text-muted); margin: 0 0 0 0.3rem;">Evento:</label>
          <select id="filtroEventoSemanal" style="padding: 0.2rem 0.45rem; font-size: 0.76rem; width: auto;" onchange="cambiarFiltroEventoSemanal(this.value)">
            <option value="TODOS" ${AppState.filtroEventoSemanal === 'TODOS' ? 'selected' : ''}>Todos los Eventos</option>
            <option value="PROGRAMADO" ${AppState.filtroEventoSemanal === 'PROGRAMADO' ? 'selected' : ''}>🔵 Programados</option>
            <option value="HABILITADO" ${AppState.filtroEventoSemanal === 'HABILITADO' ? 'selected' : ''}>🟢 Habilitados</option>
            <option value="DESARME" ${AppState.filtroEventoSemanal === 'DESARME' ? 'selected' : ''}>🔴 Desarmes</option>
            <option value="ALQUILER" ${AppState.filtroEventoSemanal === 'ALQUILER' ? 'selected' : ''}>🟡 Alertas 30d</option>
          </select>
        </div>

        <div style="display: flex; gap: 0.3rem; align-items: center;">
          <input type="text" id="busquedaSemanalInput" placeholder="Buscar andamio, ubicación..." value="${AppState.busquedaSemanal}" style="padding: 0.2rem 0.45rem; font-size: 0.76rem; width: 190px;" oninput="handleBusquedaSemanalInput(this.value)">
          ${AppState.busquedaSemanal ? `<button class="btn btn-outline btn-sm" onclick="limpiarBusquedaSemanal()" style="padding: 0.15rem 0.35rem;">✖</button>` : ''}
        </div>
      </div>

      <!-- KPIs de la Semana Operativa en la Fila Inferior de la Tarjeta -->
      <div class="header-kpis-grid" style="margin-top: 0.5rem; padding-top: 0.45rem; border-top: 1px solid var(--border);">
        <div class="calc-box-compact" style="padding: 0.3rem 0.45rem;">
          <div class="calc-val" style="color: #38bdf8; font-size: 1.15rem;">${totalEventosSemana}</div>
          <div class="calc-label">Movimientos Ciclo</div>
        </div>
        <div class="calc-box-compact" style="padding: 0.3rem 0.45rem;">
          <div class="calc-val" style="color: #10b981; font-size: 1.15rem;">${andamiosActivosSemana.length}</div>
          <div class="calc-label">${m3TotalActivoSemana.toFixed(1)} m³ · ${m2TotalActivoSemana.toFixed(1)} m²</div>
        </div>
        <div class="calc-box-compact" style="padding: 0.3rem 0.45rem;">
          <div class="calc-val" style="color: #f59e0b; font-size: 1.15rem;">${andamiosEnAlquilerSemana.length}</div>
          <div class="calc-label">En Alquiler (>30d)</div>
        </div>
        <div class="calc-box-compact" style="padding: 0.3rem 0.45rem;">
          <div class="calc-val" style="color: #ef4444; font-size: 1.15rem;">${desarmesSemana.length}</div>
          <div class="calc-label">Desarmes en Proceso</div>
        </div>
      </div>
    </div>

    <!-- Selector de Sub-pestañas Semanales -->
    <div style="display: flex; gap: 0.35rem; margin-bottom: 0.65rem; border-bottom: 1px solid var(--border); padding-bottom: 0.35rem; flex-wrap: wrap;">
      <button class="btn btn-sm ${AppState.subTabSemanal === 'tablero' ? '' : 'btn-outline'}" onclick="cambiarSubTabSemanal('tablero')" style="${AppState.subTabSemanal === 'tablero' ? 'background: #0284c7; color: #fff;' : ''} padding: 0.3rem 0.6rem; font-size: 0.8rem;">
        📅 1. Tablero Diario (7 Días)
      </button>
      <button class="btn btn-sm ${AppState.subTabSemanal === 'activos' ? '' : 'btn-outline'}" onclick="cambiarSubTabSemanal('activos')" style="${AppState.subTabSemanal === 'activos' ? 'background: #0284c7; color: #fff;' : ''} padding: 0.3rem 0.6rem; font-size: 0.8rem;">
        🏗️ 2. Parque Activo en la Semana (${andamiosActivosSemana.length})
      </button>
      <button class="btn btn-sm ${AppState.subTabSemanal === 'contratistas' ? '' : 'btn-outline'}" onclick="cambiarSubTabSemanal('contratistas')" style="${AppState.subTabSemanal === 'contratistas' ? 'background: #0284c7; color: #fff;' : ''} padding: 0.3rem 0.6rem; font-size: 0.8rem;">
        📊 3. Resumen Consolidado por Contratista
      </button>
    </div>

    <!-- Contenido de la Sub-Pestaña Activa -->
    <div id="subTabContentSemanal">
      ${AppState.subTabSemanal === 'tablero' ? renderTablero7Dias(eventosPorDia) :
        AppState.subTabSemanal === 'activos' ? renderTablaActivosSemanal(andamiosActivosSemana) :
        renderResumenContratistasSemanal(andamiosActivosSemana, eventosPorDia)}
    </div>
  `;
}

function renderTablero7Dias(eventosPorDia) {
  return `
    <div class="semana-grid-7">
      ${eventosPorDia.map(epd => {
        const d = epd.dia;
        const total = epd.eventos.length;
        return `
          <div class="dia-columna ${d.esHoy ? 'hoy' : ''} ${d.esFinDeSemana ? 'finde' : ''}">
            <div class="dia-header">
              <div style="font-weight: 800; font-size: 0.88rem; color: ${d.esHoy ? '#10b981' : '#fff'}; display: flex; align-items: center; justify-content: center; gap: 0.35rem;">
                <span>${d.nombreDia}</span>
                ${d.esHoy ? `<span class="badge" style="background: #10b981; color: #000; font-size: 0.65rem; padding: 1px 4px; font-weight: 900;">HOY</span>` : ''}
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                ${d.diaNum}/${d.mesNum < 10 ? '0' + d.mesNum : d.mesNum}
              </div>
              <div style="margin-top: 4px;">
                <span class="badge" style="font-size: 0.68rem; background: ${total > 0 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)'}; color: ${total > 0 ? '#38bdf8' : 'var(--text-muted)'};">
                  ${total} ${total === 1 ? 'evento' : 'eventos'}
                </span>
              </div>
            </div>

            <div class="dia-body">
              ${total === 0 ? `
                <div style="text-align: center; padding: 1.5rem 0.5rem; color: var(--text-muted); font-size: 0.74rem;">
                  Sin movimientos
                </div>
              ` : `
                ${epd.eventos.map(ev => {
                  const s = ev.solicitud;
                  return `
                    <div class="evento-card-semanal ${ev.clase}">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.3rem;">
                        <span style="font-size: 0.68rem; font-weight: 800; text-transform: uppercase;">
                          ${ev.tipoLabel}
                        </span>
                        <small style="color: var(--arauco-accent); font-weight: 700;">${s.tarjetaId || ''}</small>
                      </div>

                      <div style="font-weight: 700; color: #fff; font-size: 0.82rem; margin-bottom: 2px;">
                        ${s.numeroCorrelativo}
                      </div>

                      <div style="font-size: 0.75rem; color: #e2e8f0; margin-bottom: 3px; line-height: 1.2;" title="${s.ubicacionTecnica}">
                        📍 <strong>${s.ubicacionTecnica}</strong>
                      </div>

                      <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 4px;">
                        🏢 ${s.proveedorAsignado || 'Sin empresa'}
                      </div>

                      <div style="background: rgba(255,255,255,0.04); padding: 3px 6px; border-radius: 4px; display: flex; justify-content: space-between; font-size: 0.72rem; margin-bottom: 5px;">
                        <span style="color: #38bdf8; font-weight: 700;">${ev.vol} m³</span>
                        <span style="color: #4ade80; font-weight: 700;">${ev.sup} m²</span>
                      </div>

                      ${s.fotoAndamioMontado ? `
                        <div style="margin-bottom: 5px;">
                          <img src="${s.fotoAndamioMontado}" alt="Foto Andamio" style="width: 100%; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #334155; cursor: pointer;" onclick="window.open('${s.fotoAndamioMontado}', '_blank')" title="Ver foto de terreno">
                        </div>
                      ` : ''}

                      <div style="display: flex; gap: 0.25rem; justify-content: flex-end; margin-top: 4px;">
                        <button class="btn btn-outline btn-sm" style="padding: 0.15rem 0.35rem; font-size: 0.68rem;" onclick="imprimirPlanillaOficialARAUCO('${s.id}')" title="Ver e imprimir Planilla Oficial">
                          📄
                        </button>
                        <button class="btn btn-outline btn-sm" style="padding: 0.15rem 0.35rem; font-size: 0.68rem;" onclick="imprimirTarjetaHabilitacionPorId('${s.id}')" title="Ver Tarjeta QR">
                          🏷️
                        </button>
                        <button class="btn btn-outline btn-sm" style="padding: 0.15rem 0.35rem; font-size: 0.68rem;" onclick="window.open('/verificar.html?id=' + encodeURIComponent('${s.numeroCorrelativo}'), '_blank')" title="Auditoría Web">
                          🌐
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              `}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderTablaActivosSemanal(andamios) {
  if (andamios.length === 0) {
    return `
      <div class="info-card" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        No se registraron andamios activos en la planta durante esta semana operativa.
      </div>
    `;
  }

  return `
    <div class="info-card">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 0.85rem;">
        <h3 style="margin: 0;">🏗️ Andamios Activos en Planta (Semana Operativa)</h3>
        <span style="font-size: 0.8rem; color: var(--text-muted);">Total: <strong>${andamios.length} estructuras</strong></span>
      </div>

      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>N° Solicitud / Tarjeta</th>
              <th>Ubicación Técnica</th>
              <th>Empresa Armadora</th>
              <th>Volumen Real</th>
              <th>Superficie Plat.</th>
              <th>Permanencia</th>
              <th>Estado Actual</th>
              <th>Foto Montaje</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${andamios.map(s => {
              const vol = s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0;
              const sup = s.totalSuperficieRealM2 || s.dimSolicitadaPlataforma?.superficieM2 || 0;
              const dias = s.diasPermanencia || 1;
              const esAlquiler = s.estado === 'EN_ALQUILER' || dias > 30;

              return `
                <tr>
                  <td>
                    <strong>${s.numeroCorrelativo}</strong><br>
                    <small style="color: var(--arauco-accent);">${s.tarjetaId}</small>
                  </td>
                  <td>
                    <strong>${s.ubicacionTecnica}</strong><br>
                    <small style="color: var(--text-muted);">${s.sector} (${s.centroCostos})</small>
                  </td>
                  <td>
                    <small><strong>${s.proveedorAsignado || 'N/A'}</strong></small>
                  </td>
                  <td>
                    <strong style="color: #38bdf8;">${vol} m³</strong>
                  </td>
                  <td>
                    <strong style="color: #4ade80;">${sup} m²</strong>
                  </td>
                  <td>
                    <span style="font-weight: 800; color: ${esAlquiler ? '#ef4444' : (dias > 25 ? '#f59e0b' : '#10b981')};">
                      Día ${dias} de 30
                    </span><br>
                    <small style="color: var(--text-muted);">${esAlquiler ? '⚠️ EN ALQUILER' : 'En plazo normal'}</small>
                  </td>
                  <td>
                    <span class="status-badge ${s.estado.toLowerCase()}">${s.estado}</span>
                  </td>
                  <td>
                    ${s.fotoAndamioMontado ? `
                      <img src="${s.fotoAndamioMontado}" alt="Foto" style="width: 45px; height: 45px; object-fit: cover; border-radius: 4px; border: 1px solid var(--arauco-accent); cursor: pointer;" onclick="window.open('${s.fotoAndamioMontado}', '_blank')" title="Ver foto">
                    ` : '<small style="color: var(--text-muted);">-</small>'}
                  </td>
                  <td>
                    <div style="display: flex; gap: 0.3rem;">
                      <button class="btn btn-outline btn-sm" onclick="imprimirPlanillaOficialARAUCO('${s.id}')" title="Planilla Oficial">
                        📄 Planilla
                      </button>
                      <button class="btn btn-outline btn-sm" onclick="imprimirTarjetaHabilitacionPorId('${s.id}')" title="Tarjeta QR">
                        🏷️ QR
                      </button>
                      <button class="btn btn-outline btn-sm" onclick="window.open('/verificar.html?id=' + encodeURIComponent('${s.numeroCorrelativo}'), '_blank')" title="Ficha Web">
                        🌐 Ficha
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderResumenContratistasSemanal(andamiosActivos, eventosPorDia) {
  const empresas = ['Andamios del Sur S.A.', 'Montajes Industriales S.A.'];

  const resumen = empresas.map(emp => {
    const misActivos = andamiosActivos.filter(s => s.proveedorAsignado === emp);
    let m3 = 0, m2 = 0;
    misActivos.forEach(s => {
      m3 += (s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0);
      m2 += (s.totalSuperficieRealM2 || s.dimSolicitadaPlataforma?.superficieM2 || 0);
    });

    let montajesSemana = 0;
    let desarmesSemana = 0;
    eventosPorDia.forEach(epd => {
      epd.eventos.forEach(ev => {
        if (ev.solicitud?.proveedorAsignado === emp) {
          if (ev.tipo === 'HABILITADO' || ev.tipo === 'PROGRAMADO') montajesSemana++;
          if (ev.tipo === 'DESARME') desarmesSemana++;
        }
      });
    });

    const enAlquiler = misActivos.filter(s => s.estado === 'EN_ALQUILER' || (s.diasPermanencia && s.diasPermanencia > 30)).length;

    return {
      empresa: emp,
      activosPlanta: misActivos.length,
      volumenM3: m3.toFixed(1),
      superficieM2: m2.toFixed(1),
      montajesSemana,
      desarmesSemana,
      enAlquiler
    };
  });

  return `
    <div class="info-card">
      <div style="border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 1rem;">
        <h3 style="margin: 0;">📊 Resumen de Producción & Desempeño por Contratista (Semanal)</h3>
        <p style="color: var(--text-muted); font-size: 0.82rem; margin-top: 0.2rem;">
          Balance operativo del ciclo Miércoles a Martes para control de cuadrillas y avance.
        </p>
      </div>

      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Empresa Contratista</th>
              <th>Andamios Activos</th>
              <th>Volumen Total (m³)</th>
              <th>Superficie Plat. (m²)</th>
              <th>Montajes en Ciclo</th>
              <th>Desarmes en Ciclo</th>
              <th>En Alquiler (>30d)</th>
            </tr>
          </thead>
          <tbody>
            ${resumen.map(r => `
              <tr>
                <td><strong>🏢 ${r.empresa}</strong></td>
                <td><span style="font-weight: 800; font-size: 1rem; color: #fff;">${r.activosPlanta}</span></td>
                <td><strong style="color: #38bdf8;">${r.volumenM3} m³</strong></td>
                <td><strong style="color: #4ade80;">${r.superficieM2} m²</strong></td>
                <td><span class="status-badge activo">${r.montajesSemana} montajes</span></td>
                <td><span class="status-badge cancelado">${r.desarmesSemana} desarmes</span></td>
                <td>
                  <span style="font-weight: 800; color: ${r.enAlquiler > 0 ? '#ef4444' : '#10b981'};">
                    ${r.enAlquiler > 0 ? `⚠️ ${r.enAlquiler} alquilados` : '0'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

window.navegarSemana = (delta) => {
  AppState.semanaOffset = (AppState.semanaOffset || 0) + delta;
  renderPortalPorRol();
};

window.irSemanaActual = () => {
  AppState.semanaOffset = 0;
  renderPortalPorRol();
};

window.cambiarFiltroEmpresaSemanal = (empresa) => {
  AppState.filtroEmpresaSemanal = empresa;
  renderPortalPorRol();
};

window.cambiarFiltroEventoSemanal = (evento) => {
  AppState.filtroEventoSemanal = evento;
  renderPortalPorRol();
};

window.cambiarSubTabSemanal = (subTab) => {
  AppState.subTabSemanal = subTab;
  renderPortalPorRol();
};

window.handleBusquedaSemanalInput = (val) => {
  AppState.busquedaSemanal = val;
  const container = document.getElementById('subTabContentSemanal');
  if (container) {
    const semana = obtenerSemanaMiercolesMartes(AppState.semanaOffset);
    renderVistaSemanalGestionador(document.getElementById('tabContentGestionador'));
  }
};

window.limpiarBusquedaSemanal = () => {
  AppState.busquedaSemanal = '';
  renderPortalPorRol();
};

function renderBandejaGestionador(container) {
  const list = AppState.todasSolicitudesGestionador.filter(s => ['SOLICITADO', 'PROGRAMADO'].includes(s.estado));

  container.innerHTML = `
    <div class="info-card">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <h3>📥 Bandeja de Entrada de Solicitudes (Triage & Programación)</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem;">
            Aprueba, define prioridad, asigna Empresa de Servicio y redacta las indicaciones del caso.
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <input type="text" id="filtroBandeja" placeholder="🔍 Filtrar pedido, sector, solicitante..." style="width: 250px; padding: 0.35rem 0.6rem; font-size: 0.85rem;" oninput="filtrarTablaBandeja()">
          <button class="btn btn-outline btn-sm btn-toggle-compacto" onclick="toggleModoCompacto()" title="Alternar entre modo normal y modo alta densidad compacto">
            ${AppState.modoCompacto ? '🔍 Modo Normal' : '📐 Modo Compacto'}
          </button>
          <button class="btn btn-sm" onclick="abrirModalProgramarLote()" id="btnProgramarLote" style="display: none;">
            ⚙️ Asignar Lote Seleccionado
          </button>
        </div>
      </div>

      ${list.length === 0 ? `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No hay pedidos pendientes de programar en la bandeja.
        </div>
      ` : `
        <div class="table-responsive">
          <table id="tablaBandeja" class="${AppState.modoCompacto ? 'table-compact' : ''}">
            <thead>
              <tr>
                <th style="width: 30px;"><input type="checkbox" onchange="toggleSelectTodosPedidos(event)"></th>
                <th>N° Solicitud / Tarjeta</th>
                <th>Tipo</th>
                <th>Ubicación / Sector</th>
                <th>Solicitante</th>
                <th>Metraje Solicitado</th>
                <th>Estado / Empresa</th>
                <th>Acciones del Gestionador</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(s => {
    const vol = s.dimSolicitadaAndamio?.volumenM3 || 0;
    const sup = s.dimSolicitadaPlataforma?.superficieM2 || 0;
    return `
                  <tr>
                    <td>
                      <input type="checkbox" class="chk-pedido" value="${s.id}" onchange="toggleSelectPedido('${s.id}')">
                    </td>
                    <td>
                      <strong>${s.numeroCorrelativo}</strong><br>
                      <small style="color: var(--arauco-accent);">${s.tarjetaId}</small>
                    </td>
                    <td>
                      <span class="status-badge ${s.tipoOperacion === 'ANUAL' ? 'solicitado' : 'programado'}">
                        ${s.tipoOperacion === 'ANUAL' ? 'ANUAL' : 'PGP'}
                      </span>
                    </td>
                    <td>
                      <strong>${s.ubicacionTecnica}</strong><br>
                      <small style="color: var(--text-muted);">${s.sector} · CC: ${s.centroCostos}</small>
                      ${s.fotoAndamioMontado ? `
                        <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                          <img src="${s.fotoAndamioMontado}" alt="Foto Andamio" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid var(--arauco-accent); cursor: pointer;" onclick="window.open('${s.fotoAndamioMontado}', '_blank')" title="Ver fotografía del andamio montado">
                          <small style="color: var(--arauco-accent); font-size: 0.72rem; cursor: pointer;" onclick="window.open('${s.fotoAndamioMontado}', '_blank')">📷 Foto Montaje</small>
                        </div>
                      ` : ''}
                    </td>
                    <td>
                      ${s.solicitanteNombre}<br>
                      <small style="color: var(--text-muted);">Legajo: ${s.legajo}</small>
                    </td>
                    <td>
                      <span style="color: #38bdf8; font-weight: 700;">${vol} m³</span> · 
                      <span style="color: #4ade80; font-weight: 700;">${sup} m²</span>
                    </td>
                    <td>
                      <span class="status-badge ${s.estado.toLowerCase()}">${s.estado}</span><br>
                      <small style="color: var(--arauco-accent);">${s.proveedorAsignado || 'Sin empresa asignada'}</small>
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                        <button class="btn btn-sm" onclick="abrirModalProgramarIndividual('${s.id}')">
                          ⚙️ Programar
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="imprimirPlanillaOficialARAUCO('${s.id}')" title="Imprimir Planilla Oficial ARAUCO N° 01-XXXXXXXX">
                          📄 Planilla
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="compartirPorWhatsApp('${s.id}')" title="Enviar por WhatsApp">
                          📲 WhatsApp
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="anularPedidoGestionador('${s.id}')" title="Anular pedido">
                          ✖
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
  }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>

    <!-- Modal de Programación / Asignación -->
    <div id="modalProgramacion" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center; padding: 1rem;">
      <div class="auth-wrapper" style="max-width: 600px; margin: 0; width: 100%;">
        <h3 id="modalProgTitulo">Programar Orden de Montaje</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
          Asigna la empresa ejecutora, turno e indicaciones específicas de seguridad y montaje.
        </p>

        <form id="formProgramar" onsubmit="guardarProgramacion(event)">
          <input type="hidden" id="progPedidoIds">

          <div class="form-group">
            <label>Empresa de Servicio Asignada</label>
            <select id="progEmpresa" required>
              ${AppState.empresas.map(e => `
                <option value="${e.nombre}">${e.nombre}</option>
              `).join('')}
            </select>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label>Fecha Programada</label>
              <input type="date" id="progFecha" required value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
              <label>Prioridad</label>
              <select id="progPrioridad">
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente / Crítica</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Indicaciones del Gestionador para la Empresa (Visible en la App)</label>
            <textarea id="progIndicaciones" rows="3" placeholder="Ej. Pedir permiso en sala de control CR. Dejar libre válvula lateral..."></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem;">
            <button type="button" class="btn btn-outline" onclick="cerrarModalProgramar()">Cancelar</button>
            <button type="submit" class="btn">🚀 Confirmar y Despachar Orden</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

window.toggleSelectPedido = (id) => {
  if (AppState.pedidosSeleccionados.has(id)) AppState.pedidosSeleccionados.delete(id);
  else AppState.pedidosSeleccionados.add(id);
  actualizarBtnLote();
};

window.toggleSelectTodosPedidos = (e) => {
  const chks = document.querySelectorAll('.chk-pedido');
  chks.forEach(c => {
    c.checked = e.target.checked;
    if (e.target.checked) AppState.pedidosSeleccionados.add(c.value);
    else AppState.pedidosSeleccionados.delete(c.value);
  });
  actualizarBtnLote();
};

function actualizarBtnLote() {
  const btn = document.getElementById('btnProgramarLote');
  if (!btn) return;
  if (AppState.pedidosSeleccionados.size > 0) {
    btn.style.display = 'inline-flex';
    btn.textContent = `⚙️ Asignar Lote (${AppState.pedidosSeleccionados.size} pedidos)`;
  } else {
    btn.style.display = 'none';
  }
}

window.abrirModalProgramarIndividual = (solicitudId) => {
  const sol = AppState.todasSolicitudesGestionador.find(s => s.id === solicitudId);
  if (!sol) return;

  document.getElementById('modalProgTitulo').textContent = `Programar Pedido ${sol.numeroCorrelativo}`;
  document.getElementById('progPedidoIds').value = JSON.stringify([sol.id]);
  document.getElementById('progEmpresa').value = sol.proveedorAsignado || AppState.empresas[0]?.nombre || '';
  document.getElementById('progPrioridad').value = sol.prioridad || 'NORMAL';
  document.getElementById('progIndicaciones').value = sol.indicacionesGestionador || '';
  document.getElementById('modalProgramacion').style.display = 'flex';
};

window.abrirModalProgramarLote = () => {
  const ids = Array.from(AppState.pedidosSeleccionados);
  if (ids.length === 0) return;

  document.getElementById('modalProgTitulo').textContent = `Programar Lote (${ids.length} pedidos)`;
  document.getElementById('progPedidoIds').value = JSON.stringify(ids);
  document.getElementById('modalProgramacion').style.display = 'flex';
};

window.cerrarModalProgramar = () => {
  document.getElementById('modalProgramacion').style.display = 'none';
};

window.guardarProgramacion = async (e) => {
  e.preventDefault();
  const ids = JSON.parse(document.getElementById('progPedidoIds').value || '[]');
  const proveedorAsignado = document.getElementById('progEmpresa').value;
  const fechaProgramada = document.getElementById('progFecha').value;
  const prioridad = document.getElementById('progPrioridad').value;
  const indicacionesGestionador = document.getElementById('progIndicaciones').value;

  try {
    const res = await fetch('/api/gestionador/programar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, proveedorAsignado, fechaProgramada, prioridad, indicacionesGestionador })
    }).then(r => r.json());

    if (res.ok) {
      alert(`✅ ${res.actualizados} pedido(s) programados y asignados a ${proveedorAsignado}.`);
      AppState.pedidosSeleccionados.clear();
      cerrarModalProgramar();
      renderPortalPorRol();
    } else {
      alert('Error: ' + res.error);
    }
  } catch (err) {
    alert('Fallo de conexión al programar pedidos');
  }
};

window.anularPedidoGestionador = async (solicitudId) => {
  const motivo = prompt('Ingresa el motivo de anulación del pedido:');
  if (!motivo) return;

  try {
    const res = await fetch(`/api/gestionador/anular/${solicitudId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivoAnulacion: motivo })
    }).then(r => r.json());

    if (res.ok) {
      alert(`✅ Pedido ${res.solicitud.numeroCorrelativo} anulado con éxito.`);
      renderPortalPorRol();
    } else {
      alert('Error: ' + res.error);
    }
  } catch (err) {
    alert('Fallo de conexión al anular el pedido');
  }
};

window.compartirPorWhatsApp = (solicitudId) => {
  const sol = AppState.todasSolicitudesGestionador.find(s => s.id === solicitudId);
  if (!sol) return;

  const texto =
    `*ARAUCO - ORDEN DE ANDAMIO ${sol.numeroCorrelativo}*\n` +
    `*Tarjeta:* ${sol.tarjetaId}\n` +
    `*Ubicación:* ${sol.ubicacionTecnica} (${sol.sector})\n` +
    `*Motivo:* ${sol.motivo}\n` +
    `*Metraje:* ${sol.dimSolicitadaAndamio?.volumenM3 || 0} m³ | ${sol.dimSolicitadaPlataforma?.superficieM2 || 0} m²\n` +
    `*Empresa:* ${sol.proveedorAsignado || 'A definir'}\n` +
    `*Prioridad:* ${sol.prioridad}\n` +
    `*Indicaciones:* ${sol.indicacionesGestionador || 'Sin observaciones'}\n` +
    `_Acceder a la app para dar acuse de recibo y cargar habilitación._`;

  const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank');
};

function renderParqueActivoGestionador(container) {
  const list = AppState.todasSolicitudesGestionador.filter(s => ['HABILITADO', 'EN_ALQUILER'].includes(s.estado));

  container.innerHTML = `
    <div class="info-card">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <h3>🏗️ Parque de Andamios Activos en Planta (Inventario Vivo)</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem;">
            Supervisa las estructuras montadas, audita el metraje real y la regla de 30 días corridos (pase a Alquiler).
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <input type="text" id="filtroParque" placeholder="🔍 Buscar por N°, sector, caldera..." style="width: 260px; padding: 0.35rem 0.6rem; font-size: 0.85rem;" oninput="filtrarTablaParque()">
          <button class="btn btn-outline btn-sm btn-toggle-compacto" onclick="toggleModoCompacto()" title="Alternar entre modo normal y modo alta densidad compacto">
            ${AppState.modoCompacto ? '🔍 Modo Normal' : '📐 Modo Compacto'}
          </button>
        </div>
      </div>

      ${list.length === 0 ? `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No hay andamios activos en planta actualmente.
        </div>
      ` : `
        <div class="table-responsive">
          <table id="tablaParque" class="${AppState.modoCompacto ? 'table-compact' : ''}">
            <thead>
              <tr>
                <th>N° Solicitud / Tarjeta</th>
                <th>Sector / Ubicación</th>
                <th>Empresa Armadora</th>
                <th>Volumen / Sup. Real</th>
                <th>Antigüedad en Planta</th>
                <th>Estado Tarjeta</th>
                <th>Acciones de Oficio</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(s => {
    const vol = s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0;
    const sup = s.totalSuperficieRealM2 || s.dimSolicitadaPlataforma?.superficieM2 || 0;
    const dias = s.diasPermanencia || 1;
    const esAlquiler = s.estado === 'EN_ALQUILER' || dias > 30;

    return `
                  <tr>
                    <td>
                      <strong>${s.numeroCorrelativo}</strong><br>
                      <small style="color: var(--arauco-accent);">${s.tarjetaId}</small>
                    </td>
                    <td>
                      <strong>${s.ubicacionTecnica}</strong><br>
                      <small style="color: var(--text-muted);">${s.sector} · CC: ${s.centroCostos}</small>
                      ${s.fotoAndamioMontado ? `
                        <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                          <img src="${s.fotoAndamioMontado}" alt="Foto Andamio" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid var(--arauco-accent); cursor: pointer;" onclick="window.open('${s.fotoAndamioMontado}', '_blank')" title="Ver fotografía del andamio montado">
                          <small style="color: var(--arauco-accent); font-size: 0.72rem; cursor: pointer;" onclick="window.open('${s.fotoAndamioMontado}', '_blank')">📷 Foto Montaje</small>
                        </div>
                      ` : ''}
                    </td>
                    <td>
                      ${s.proveedorAsignado || 'N/A'}<br>
                      <small style="color: var(--text-muted);">Armado: ${s.fechaArmado ? s.fechaArmado.split('T')[0] : 'Hoy'}</small>
                    </td>
                    <td>
                      <span style="color: #38bdf8; font-weight: 700;">${vol} m³</span> · 
                      <span style="color: #4ade80; font-weight: 700;">${sup} m²</span>
                    </td>
                    <td>
                      <span style="font-weight: 800; color: ${esAlquiler ? '#ef4444' : (dias > 25 ? '#f59e0b' : '#10b981')};">
                        Día ${dias} de 30
                      </span><br>
                      <small style="color: var(--text-muted);">${esAlquiler ? '⚠️ EN ALQUILER' : 'En plazo normal'}</small>
                    </td>
                    <td>
                      <span class="status-badge ${s.estado.toLowerCase()}">${s.estado}</span>
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                        <button class="btn btn-outline btn-sm" onclick="imprimirPlanillaOficialARAUCO('${s.id}')">
                          📄 Planilla
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="imprimirTarjetaHabilitacionPorId('${s.id}')" title="Imprimir tarjeta física con QR">
                          🏷️ QR
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="window.open('/verificar.html?id=' + encodeURIComponent('${s.numeroCorrelativo}'), '_blank')" title="Ver ficha técnica QR">
                          🌐 Ficha
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="abrirModalSolicitarReforma('${s.id}')" title="Solicitar ampliación o reforma">
                          ➕ Reforma
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="ordenarDesarmeDeOficio('${s.id}')">
                          🚩 Desarme de Oficio
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
  }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

window.filtrarTablaBandeja = () => {
  const query = document.getElementById('filtroBandeja')?.value.toLowerCase() || '';
  const filas = document.querySelectorAll('#tablaBandeja tbody tr');
  filas.forEach(f => {
    f.style.display = f.textContent.toLowerCase().includes(query) ? '' : 'none';
  });
};

window.toggleModoCompacto = () => {
  AppState.modoCompacto = !AppState.modoCompacto;
  document.querySelectorAll('.table-responsive table').forEach(t => {
    if (AppState.modoCompacto) t.classList.add('table-compact');
    else t.classList.remove('table-compact');
  });
  document.querySelectorAll('.btn-toggle-compacto').forEach(b => {
    b.innerHTML = AppState.modoCompacto ? '🔍 Modo Normal' : '📐 Modo Compacto';
  });
};

window.filtrarTablaParque = () => {
  const query = document.getElementById('filtroParque')?.value.toLowerCase() || '';
  const filas = document.querySelectorAll('#tablaParque tbody tr');
  filas.forEach(f => {
    f.style.display = f.textContent.toLowerCase().includes(query) ? '' : 'none';
  });
};

window.ordenarDesarmeDeOficio = async (solicitudId) => {
  const indicaciones = prompt('Indicaciones de Desarme de Oficio (opcional):', 'Desmontar por vencimiento de plazo o finalización de trabajo');
  if (indicaciones === null) return;

  try {
    const res = await fetch(`/api/gestionador/asignar-desarme/${solicitudId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ indicacionesDesarme: indicaciones, prioridad: 'ALTA' })
    }).then(r => r.json());

    if (res.ok) {
      alert(`✅ Orden de desarme de oficio emitida para el andamio ${res.solicitud.numeroCorrelativo}.\nAsignada a ${res.solicitud.proveedorAsignado}.`);
      renderPortalPorRol();
    } else {
      alert('Error: ' + res.error);
    }
  } catch (err) {
    alert('Fallo de conexión al ordenar desarme');
  }
};

function renderDesarmesGestionador(container) {
  const list = AppState.todasSolicitudesGestionador.filter(s => s.estado === 'DESARME_SOLICITADO');

  container.innerHTML = `
    <div class="info-card">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <div>
          <h3>🚩 Bandeja de Avisos de Desarme (Solicitante & De Oficio)</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem;">
            Revisa los andamios liberados y despacha la orden de desarme a la contratista adjuntando la fotografía del andamio montado para su rápida ubicación en planta.
          </p>
        </div>
      </div>

      ${list.length === 0 ? `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No hay avisos de desarme pendientes de asignar.
        </div>
      ` : `
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>N° Solicitud / Tarjeta</th>
                <th>Ubicación Técnica</th>
                <th>Empresa Asignada</th>
                <th>Foto de Montaje (Referencia)</th>
                <th>Fecha Aviso Desarme</th>
                <th>Indicaciones de Desarme</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(s => `
                <tr>
                  <td>
                    <strong>${s.numeroCorrelativo}</strong><br>
                    <small style="color: var(--arauco-accent);">${s.tarjetaId}</small>
                  </td>
                  <td>
                    <strong>${s.ubicacionTecnica}</strong><br>
                    <small style="color: var(--text-muted);">${s.sector}</small>
                  </td>
                  <td>${s.proveedorAsignado || 'A definir'}</td>
                  <td>
                    ${s.fotoAndamioMontado ? `
                      <img src="${s.fotoAndamioMontado}" alt="Foto Andamio" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border); cursor: pointer;" onclick="window.open('${s.fotoAndamioMontado}', '_blank')">
                    ` : '<span style="color: var(--text-muted); font-size: 0.8rem;">Sin foto de montaje</span>'}
                  </td>
                  <td>${s.fechaSolicitudDesarme ? s.fechaSolicitudDesarme.split('T')[0] : 'Hoy'}</td>
                  <td>
                    <input type="text" id="indDes-${s.id}" value="${s.indicacionesDesarme || 'Desmontar y retirar materiales antes de fin de turno'}" style="font-size: 0.8rem; padding: 0.35rem 0.6rem;">
                  </td>
                  <td>
                    <button class="btn btn-sm" onclick="despacharDesarme('${s.id}')">
                      🚀 Despachar Desarme
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

window.despacharDesarme = async (solicitudId) => {
  const indicaciones = document.getElementById(`indDes-${solicitudId}`)?.value || '';

  try {
    const res = await fetch(`/api/gestionador/asignar-desarme/${solicitudId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ indicacionesDesarme: indicaciones, prioridad: 'ALTA' })
    }).then(r => r.json());

    if (res.ok) {
      alert(`✅ Orden de desarme despachada a ${res.solicitud.proveedorAsignado} con la foto de referencia.`);
      renderPortalPorRol();
    } else {
      alert('Error: ' + res.error);
    }
  } catch (err) {
    alert('Fallo de conexión al despachar desarme');
  }
};

function renderKPIsGestionador(container) {
  const m = AppState.metricasGestionador || {};
  const todas = AppState.todasSolicitudesGestionador;

  const porEmpresa = {};
  todas.forEach(s => {
    const emp = s.proveedorAsignado || 'Sin Asignar';
    if (!porEmpresa[emp]) porEmpresa[emp] = { total: 0, activos: 0, m3: 0, m2: 0 };
    porEmpresa[emp].total += 1;
    if (['HABILITADO', 'EN_ALQUILER'].includes(s.estado)) {
      porEmpresa[emp].activos += 1;
      porEmpresa[emp].m3 += (s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0);
      porEmpresa[emp].m2 += (s.totalSuperficieRealM2 || s.dimSolicitadaPlataforma?.superficieM2 || 0);
    }
  });

  container.innerHTML = `
    <div class="info-card">
      <div style="border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <h3>📈 Métricas de Gestión, Cómputo de Metraje y Desempeño</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem;">
          Control consolidado de m³ y m² para auditoría previa a la Certificación Oficial.
        </p>
      </div>

      <div class="grid-3" style="margin-bottom: 1.5rem;">
        <div class="calc-box">
          <div class="calc-val" style="color: #38bdf8;">${m.m3ActivosPlanta || 0} m³</div>
          <div class="calc-label">Total Volumen Activo en Planta</div>
        </div>
        <div class="calc-box">
          <div class="calc-val" style="color: #4ade80;">${m.m2ActivosPlanta || 0} m²</div>
          <div class="calc-label">Total Plataformas Activas en Planta</div>
        </div>
        <div class="calc-box">
          <div class="calc-val" style="color: #f59e0b;">${m.enAlquiler || 0}</div>
          <div class="calc-label">Andamios en Alquiler (>30 días corridos)</div>
        </div>
      </div>

      <h4>Distribución por Empresa Contratista</h4>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Empresa de Servicio</th>
              <th>Total Pedidos Asignados</th>
              <th>Activos en Planta</th>
              <th>Volumen Activo (m³)</th>
              <th>Plataformas Activas (m²)</th>
            </tr>
          </thead>
          <tbody>
            ${Object.keys(porEmpresa).map(k => `
              <tr>
                <td><strong>${k}</strong></td>
                <td>${porEmpresa[k].total}</td>
                <td><span class="status-badge habilitado">${porEmpresa[k].activos}</span></td>
                <td style="color: #38bdf8; font-weight: 700;">${parseFloat(porEmpresa[k].m3.toFixed(2))} m³</td>
                <td style="color: #4ade80; font-weight: 700;">${parseFloat(porEmpresa[k].m2.toFixed(2))} m²</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ========================================================
   MESA DE SEGURIDAD E HIGIENE (HSE) — CONTROL OPERATIVO EN PLANTA
   ======================================================== */
function renderAuditoriaGestionador(container) {
  const todas = AppState.todasSolicitudesGestionador || [];
  const computables = todas.filter(s => ['HABILITADO', 'EN_ALQUILER', 'DESHABILITADO_HSE', 'DESARME_SOLICITADO', 'DESARMADO'].includes(s.estado));

  const total = computables.length;
  const deshabilitadosHSE = computables.filter(s => s.estado === 'DESHABILITADO_HSE').length;
  const habilitadosSeguros = computables.filter(s => ['HABILITADO', 'EN_ALQUILER'].includes(s.estado)).length;
  const subsanacionesPendientes = computables.filter(s => s.eventoSeguridadHSE?.subsanacionContratista && !s.eventoSeguridadHSE.subsanado).length;

  container.innerHTML = `
    <div class="info-card" style="padding: 0.75rem 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <h3 style="margin: 0; font-size: 1.1rem; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
            🦺 Mesa de Control de Seguridad & Higiene (Auditoría HSE en Planta)
            ${deshabilitadosHSE > 0 ? `<span style="background: #dc2626; color: #fff; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.72rem; font-weight: 800; animation: pulse 1.5s infinite;">⚠️ ${deshabilitadosHSE} ANDAMIOS BLOQUEADOS</span>` : ''}
          </h3>
          <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0.2rem 0 0 0;">
            Supervisión técnica de condiciones seguras de uso, detección de partes faltantes o dañadas, armado deficiente y deshabilitación con registro fotográfico oficial.
          </p>
        </div>
        <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-warning" onclick="abrirBuscadorEscaneoQR('camara')" style="padding: 0.3rem 0.65rem; font-size: 0.8rem; font-weight: 700; background: #e0a96d; color: #1a202c; border: none; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer;">
            📷 Escanear QR
          </button>
          <select id="filtroEstadoHSE" style="padding: 0.3rem 0.5rem; font-size: 0.8rem; width: auto; background: var(--bg-input); color: #fff; border: 1px solid var(--border); border-radius: 4px;" onchange="filtrarTablaSeguridadHSE()">
            <option value="TODOS">Todos los Andamios</option>
            <option value="DESHABILITADOS" ${deshabilitadosHSE > 0 ? 'selected' : ''}>🔴 Deshabilitados HSE (${deshabilitadosHSE})</option>
            <option value="SUBSANADOS">🟡 Subsanación Enviada (${subsanacionesPendientes})</option>
            <option value="HABILITADOS">🟢 Habilitados Seguros (${habilitadosSeguros})</option>
          </select>
          <input type="text" id="filtroSeguridadInput" placeholder="🔍 Buscar N°, tarjeta, ubicación, contratista..." style="padding: 0.3rem 0.6rem; font-size: 0.8rem; width: 220px;" oninput="filtrarTablaSeguridadHSE()">
        </div>
      </div>

      <!-- Métricas Exclusivas de Seguridad e Higiene (Sin Metrajes ni Cúbicos) -->
      <div class="header-kpis-grid" style="margin-bottom: 0.85rem;">
        <div class="calc-box-compact" style="border-left: 3px solid #10b981;">
          <div class="calc-val" style="color: #10b981;">${habilitadosSeguros}</div>
          <div class="calc-label">Habilitados Seguros ✅</div>
        </div>
        <div class="calc-box-compact" style="border-left: 3px solid ${deshabilitadosHSE > 0 ? '#ef4444' : '#64748b'}; background: ${deshabilitadosHSE > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(15, 23, 42, 0.7)'};">
          <div class="calc-val" style="color: #ef4444;">${deshabilitadosHSE}</div>
          <div class="calc-label" style="color: #fca5a5; font-weight: 800;">Deshabilitados HSE ⛔</div>
        </div>
        <div class="calc-box-compact" style="border-left: 3px solid #f59e0b;">
          <div class="calc-val" style="color: #f59e0b;">${subsanacionesPendientes}</div>
          <div class="calc-label">Subsanados a Revisar 🟡</div>
        </div>
        <div class="calc-box-compact" style="border-left: 3px solid #38bdf8;">
          <div class="calc-val" style="color: #38bdf8;">${total}</div>
          <div class="calc-label">Total en Terreno 🛡️</div>
        </div>
      </div>

      ${computables.length === 0 ? `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No se encontraron andamios activos en la planta para inspeccionar en este momento.
        </div>
      ` : `
        <div class="table-responsive">
          <table id="tablaSeguridadHSE">
            <thead>
              <tr>
                <th>N° Solicitud / Tarjeta</th>
                <th>Ubicación & Sector</th>
                <th>Empresa Armadora</th>
                <th>Estado de Seguridad</th>
                <th>Hallazgos de Seguridad & Evidencia Fotográfica</th>
                <th>Permanencia</th>
                <th>Acciones HSE</th>
              </tr>
            </thead>
            <tbody>
              ${computables.map(s => {
    const esDeshabilitado = s.estado === 'DESHABILITADO_HSE';
    const evHSE = s.eventoSeguridadHSE;
    const dias = s.diasPermanencia || 1;
    const tieneSubsanacion = evHSE?.subsanacionContratista && !evHSE.subsanado;

    let badgeSeguridad = '';
    if (esDeshabilitado) {
      badgeSeguridad = `<span class="status-badge cancelado" style="background: #dc2626; color: #fff; font-weight: 800; animation: pulse 1.5s infinite;">⛔ DESHABILITADO (ROJA)</span>`;
    } else if (tieneSubsanacion) {
      badgeSeguridad = `<span class="status-badge" style="background: #f59e0b; color: #000; font-weight: 800;">🟡 CORRECCIÓN REPORTADA</span>`;
    } else if (s.estado === 'HABILITADO') {
      badgeSeguridad = `<span class="status-badge habilitado" style="background: #10b981; color: #fff;">🟢 HABILITADO (VERDE)</span>`;
    } else if (s.estado === 'EN_ALQUILER') {
      badgeSeguridad = `<span class="status-badge" style="background: #b45309; color: #fff;">🟡 EN ALQUILER (VERDE)</span>`;
    } else {
      badgeSeguridad = `<span class="status-badge" style="background: #64748b; color: #fff;">⚪ ${s.estado}</span>`;
    }

    return `
                <tr class="${esDeshabilitado ? 'fila-deshabilitada' : ''}" style="${esDeshabilitado ? 'background: rgba(220, 38, 38, 0.08);' : ''}">
                  <td>
                    <strong>${s.numeroCorrelativo}</strong><br>
                    <small style="color: ${esDeshabilitado ? '#ef4444' : 'var(--arauco-accent)'}; font-weight: 700;">${s.tarjetaId}</small>
                  </td>
                  <td>
                    <strong>${s.ubicacionTecnica}</strong><br>
                    <small style="color: var(--text-muted);">${s.sector} (${s.centroCostos})</small>
                  </td>
                  <td>
                    <small><strong>${s.proveedorAsignado || 'Sin asignar'}</strong></small>
                  </td>
                  <td>
                    ${badgeSeguridad}
                  </td>
                  <td>
                    ${esDeshabilitado && evHSE ? `
                      <div style="font-size: 0.8rem; line-height: 1.3;">
                        <span style="color: #f87171; font-weight: 800;">⚠️ ${evHSE.motivoPrincipal || 'Condición Insegura'}</span>
                        ${evHSE.itemsObservados && evHSE.itemsObservados.length > 0 ? `
                          <div style="color: #fca5a5; font-size: 0.74rem; margin-top: 2px;">
                            • ${evHSE.itemsObservados.slice(0, 2).join('<br>• ')}
                            ${evHSE.itemsObservados.length > 2 ? `<br><small style="color: #94a3b8;">(+${evHSE.itemsObservados.length - 2} más...)</small>` : ''}
                          </div>
                        ` : ''}
                        ${evHSE.fotoEvidencia ? `
                          <div style="margin-top: 4px;">
                            <button type="button" class="btn btn-sm btn-outline" style="border-color: #ef4444; color: #f87171; padding: 0.15rem 0.4rem; font-size: 0.72rem;" onclick="verFotoEvidencia('${evHSE.fotoEvidencia}', '${s.numeroCorrelativo}')">
                              📷 Ver Evidencia Fotográfica
                            </button>
                          </div>
                        ` : '<small style="color: #94a3b8;">(Sin foto adjunta)</small>'}
                        <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 3px;">
                          Inspector: ${evHSE.inspectorNombre || 'HSE'} · ${evHSE.fecha ? new Date(evHSE.fecha).toLocaleDateString() : ''}
                        </div>
                      </div>
                    ` : tieneSubsanacion ? `
                      <div style="font-size: 0.8rem; color: #fef08a;">
                        <strong>🔧 Corrección informada por contratista:</strong><br>
                        <small style="color: #fde047;">${evHSE.subsanacionContratista.detalle || 'Subsanación realizada'}</small>
                        ${evHSE.subsanacionContratista.foto ? `
                          <div style="margin-top: 3px;">
                            <button type="button" class="btn btn-sm btn-outline" style="border-color: #f59e0b; color: #fef08a; padding: 0.15rem 0.4rem; font-size: 0.72rem;" onclick="verFotoEvidencia('${evHSE.subsanacionContratista.foto}', '${s.numeroCorrelativo}')">
                              📷 Foto de la Reparación
                            </button>
                          </div>
                        ` : ''}
                      </div>
                    ` : `
                      <div style="font-size: 0.78rem; color: #86efac;">
                        ✔ Estructura apta y conforme a normativa ARAUCO.<br>
                        <small style="color: var(--text-muted);">${s.checklistHabilitacion ? 'Checklist 11 puntos firmado' : 'Habilitado en sitio'}</small>
                        ${s.fotoAndamioMontado ? `
                          <div style="margin-top: 3px;">
                            <button type="button" class="btn btn-sm btn-outline" style="padding: 0.12rem 0.35rem; font-size: 0.7rem;" onclick="verFotoEvidencia('${s.fotoAndamioMontado}', '${s.numeroCorrelativo}')">
                              📷 Foto Montaje
                            </button>
                          </div>
                        ` : ''}
                      </div>
                    `}
                  </td>
                  <td>
                    <span style="font-weight: 700; color: ${dias > 30 ? '#ef4444' : '#10b981'}; font-size: 0.82rem;">
                      Día ${dias} de 30
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
                      ${esDeshabilitado ? `
                        <button class="btn btn-sm" style="background: #10b981; color: #fff; padding: 0.2rem 0.45rem; font-size: 0.75rem;" onclick="abrirModalRehabilitarHSE('${s.id}')" title="Aprobar corrección y re-habilitar andamio (Tarjeta Verde)">
                          🟢 Re-Habilitar
                        </button>
                        <button class="btn btn-outline btn-sm" style="border-color: #f59e0b; color: #f59e0b; padding: 0.2rem 0.45rem; font-size: 0.75rem;" onclick="abrirModalSubsanarHSE('${s.id}')" title="Registrar modificaciones realizadas por contratista">
                          🔧 Subsanar
                        </button>
                      ` : `
                        <button class="btn btn-danger btn-sm" style="padding: 0.2rem 0.45rem; font-size: 0.75rem;" onclick="abrirModalDeshabilitarHSE('${s.id}')" title="Deshabilitar andamio por faltantes, componentes dañados o riesgo">
                          🚫 Deshabilitar
                        </button>
                      `}
                      <button class="btn btn-outline btn-sm" style="padding: 0.2rem 0.45rem; font-size: 0.75rem;" onclick="imprimirTarjetaHabilitacionPorId('${s.id}')" title="Ver e imprimir tarjeta oficial">
                        🏷️ Tarjeta
                      </button>
                      <button class="btn btn-outline btn-sm" style="padding: 0.2rem 0.45rem; font-size: 0.75rem;" onclick="window.open('/verificar.html?id=' + encodeURIComponent('${s.numeroCorrelativo}'), '_blank')" title="Abrir ficha pública en terreno">
                        🌐 Ficha
                      </button>
                    </div>
                  </td>
                </tr>
              `;
  }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>

    <!-- ========================================================
         MODAL 1: DESHABILITAR ANDAMIO POR SEGURIDAD (TARJETA ROJA)
         ======================================================== -->
    <div id="modalDeshabilitarHSE" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; align-items: center; justify-content: center; padding: 1rem; overflow-y: auto;">
      <div style="background: var(--bg-card); border: 2px solid #ef4444; border-radius: 10px; max-width: 540px; width: 100%; padding: 1.25rem; box-shadow: 0 10px 40px rgba(239,68,68,0.3); max-height: 90vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid #ef4444; padding-bottom: 0.5rem;">
          <h3 id="deshabilitarTituloHSE" style="margin: 0; font-size: 1.1rem; color: #fca5a5; display: flex; align-items: center; gap: 0.5rem;">
            🚫 Deshabilitar Andamio (Emisión Tarjeta Roja HSE)
          </h3>
          <button type="button" class="btn btn-outline btn-sm" onclick="cerrarModalDeshabilitarHSE()">✖</button>
        </div>

        <form onsubmit="handleDeshabilitarHSESubmit(event)">
          <input type="hidden" id="deshabilitarSolId">
          <input type="hidden" id="hseFotoUrl">

          <!-- Identificación del Andamio -->
          <div id="deshabilitarInfoBox" style="background: rgba(0,0,0,0.3); padding: 0.5rem 0.75rem; border-radius: 6px; margin-bottom: 0.75rem; font-size: 0.82rem; border-left: 3px solid #ef4444;">
          </div>

          <!-- Motivo Principal -->
          <div class="form-group" style="margin-bottom: 0.65rem;">
            <label style="font-size: 0.8rem; font-weight: 700; color: #fca5a5;">Motivo Principal de Deshabilitación:</label>
            <select id="hseMotivoPrincipal" required style="width: 100%; padding: 0.45rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 0.85rem;">
              <option value="Faltante de protecciones colectivas (Rodapiés / Barandas / Trampillas)">Faltante de protecciones colectivas (Rodapiés / Barandas / Trampillas)</option>
              <option value="Componentes estructurales en malas condiciones (Deformados / Fisurados / Corrosión)">Componentes en malas condiciones (Deformados / Fisurados / Corrosión)</option>
              <option value="Armado deficiente (Desaplomado / Inestable / Riesgo de vuelco)">Armado deficiente (Desaplomado / Inestable / Riesgo de vuelco)</option>
              <option value="Falta de apoyos reglamentarios (Bases / Tacos de madera repartidores)">Falta de apoyos reglamentarios (Bases / Tacos repartidores)</option>
              <option value="Falta de arriostramiento o anclaje a estructura fija">Falta de arriostramiento o anclaje a estructura fija</option>
              <option value="Plataforma de trabajo incompleta, rajada o con grasa/aceite">Plataforma de trabajo incompleta, rajada o con grasa/aceite</option>
              <option value="Acceso inseguro (Falta escalera reglamentaria o trampa)">Acceso inseguro (Falta escalera reglamentaria o trampa)</option>
              <option value="Modificación indebida realizada por personal no calificado">Modificación indebida realizada por personal no calificado</option>
              <option value="Interferencia peligrosa (Líneas eléctricas / Tuberías de vapor)">Interferencia peligrosa (Líneas eléctricas / Tuberías de vapor)</option>
              <option value="Otro riesgo de seguridad e higiene">Otro riesgo de seguridad e higiene</option>
            </select>
          </div>

          <!-- Checklist Rápido de Deficiencias Observadas -->
          <div class="form-group" style="margin-bottom: 0.65rem;">
            <label style="font-size: 0.8rem; font-weight: 700; color: #fca5a5;">Deficiencias Críticas Observadas en Terreno (Selecciona las que apliquen):</label>
            <div style="background: rgba(15,23,42,0.6); border: 1px solid var(--border); border-radius: 6px; padding: 0.5rem; max-height: 140px; overflow-y: auto; font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <label style="display: flex; align-items: center; gap: 0.4rem; color: #e2e8f0; margin: 0; cursor: pointer;">
                <input type="checkbox" class="chk-hse-deficiencia" value="Falta rodapié / guardapié reglamentario (mín. 15 cm de altura)"> Falta rodapié reglamentario (mín. 15 cm)
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; color: #e2e8f0; margin: 0; cursor: pointer;">
                <input type="checkbox" class="chk-hse-deficiencia" value="Falta baranda superior (a 1.00 m) o intermedia (a 0.50 m)"> Falta baranda superior (1 m) o intermedia (0.50 m)
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; color: #e2e8f0; margin: 0; cursor: pointer;">
                <input type="checkbox" class="chk-hse-deficiencia" value="Tablones o plataformas fisuradas, deformadas o con aceite/grasa"> Tablones fisurados, deformados o aceitados
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; color: #e2e8f0; margin: 0; cursor: pointer;">
                <input type="checkbox" class="chk-hse-deficiencia" value="Estructura desaplomada o sin diagonales de arriostramiento"> Estructura desaplomada o sin diagonales
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; color: #e2e8f0; margin: 0; cursor: pointer;">
                <input type="checkbox" class="chk-hse-deficiencia" value="Bases niveladoras falseadas, sueltas o sin pasadores de seguridad"> Bases niveladoras falseadas o sin pasador
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; color: #e2e8f0; margin: 0; cursor: pointer;">
                <input type="checkbox" class="chk-hse-deficiencia" value="Apoyo sobre terreno blando sin durmientes repartidores de carga"> Apoyo sobre terreno sin durmientes de madera
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; color: #e2e8f0; margin: 0; cursor: pointer;">
                <input type="checkbox" class="chk-hse-deficiencia" value="Escalera interior de acceso ausente, inaccesible o sin trampa"> Falta escalera interior reglamentaria
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; color: #e2e8f0; margin: 0; cursor: pointer;">
                <input type="checkbox" class="chk-hse-deficiencia" value="Modificación no autorizada realizada en terreno por terceros"> Modificación no autorizada en terreno
              </label>
            </div>
          </div>

          <!-- Detalle de la No Conformidad -->
          <div class="form-group" style="margin-bottom: 0.65rem;">
            <label style="font-size: 0.8rem; font-weight: 700; color: #fca5a5;">Descripción Detallada del Riesgo Hallado:</label>
            <textarea id="hseDetalleObservacion" required rows="2" placeholder="Ej: Se observa faltante de rodapié en cara norte y plataforma nivel +4.5m con tablón suelto..." style="width: 100%; padding: 0.45rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 0.82rem;"></textarea>
          </div>

          <!-- REGISTRO FOTOGRÁFICO DE LA NO-CONFORMIDAD -->
          <div class="form-group" style="margin-bottom: 0.75rem; background: rgba(0,0,0,0.25); border: 1px dashed #ef4444; border-radius: 6px; padding: 0.65rem;">
            <label style="font-size: 0.8rem; font-weight: 700; color: #fca5a5; display: block; margin-bottom: 0.35rem;">
              📷 Registro Fotográfico del Evento / Falla en Terreno:
            </label>
            <input type="file" id="hseFotoInputFile" accept="image/*" capture="environment" style="font-size: 0.8rem;" onchange="handleHSEFotoUpload(event)">
            <div id="hseFotoPreviewBox" style="margin-top: 0.5rem; text-align: center; display: none;">
              <img id="hseFotoImg" src="" alt="Foto Evidencia" style="max-width: 100%; max-height: 180px; border-radius: 6px; border: 1px solid #ef4444;">
              <div style="font-size: 0.75rem; color: #10b981; margin-top: 3px;">✔ Fotografía adjunta correctamente</div>
            </div>
            <small style="color: var(--text-muted); font-size: 0.72rem; display: block; margin-top: 4px;">
              Toma una fotografía directa o adjunta la imagen que evidencia la anomalía para la contratista.
            </small>
          </div>

          <!-- Identificación del Inspector -->
          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label style="font-size: 0.78rem; color: var(--text-muted);">Inspector de Seguridad HSE Actuante:</label>
            <input type="text" id="hseInspectorNombre" readonly style="width: 100%; padding: 0.35rem 0.5rem; font-size: 0.8rem; background: rgba(0,0,0,0.2); color: #94a3b8; border: 1px solid var(--border); border-radius: 4px;">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
            <button type="button" class="btn btn-outline btn-sm" onclick="cerrarModalDeshabilitarHSE()">Cancelar</button>
            <button type="submit" class="btn btn-danger btn-sm" style="padding: 0.4rem 0.8rem; font-weight: 700;">
              🚫 Confirmar Deshabilitación (Emitir Tarjeta Roja)
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========================================================
         MODAL 2: RE-HABILITAR ANDAMIO TRAS SUBSANACIÓN (TARJETA VERDE)
         ======================================================== -->
    <div id="modalRehabilitarHSE" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; align-items: center; justify-content: center; padding: 1rem;">
      <div style="background: var(--bg-card); border: 2px solid #10b981; border-radius: 10px; max-width: 500px; width: 100%; padding: 1.25rem; box-shadow: 0 10px 40px rgba(16,185,129,0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid #10b981; padding-bottom: 0.5rem;">
          <h3 id="rehabilitarTituloHSE" style="margin: 0; font-size: 1.1rem; color: #86efac; display: flex; align-items: center; gap: 0.5rem;">
            🟢 Re-Habilitar Andamio (Restablecer Tarjeta Verde)
          </h3>
          <button type="button" class="btn btn-outline btn-sm" onclick="cerrarModalRehabilitarHSE()">✖</button>
        </div>

        <form onsubmit="handleRehabilitarHSESubmit(event)">
          <input type="hidden" id="rehabilitarSolId">
          <input type="hidden" id="hseRehabFotoUrl">

          <div id="rehabilitarInfoBox" style="background: rgba(0,0,0,0.3); padding: 0.5rem 0.75rem; border-radius: 6px; margin-bottom: 0.75rem; font-size: 0.82rem; border-left: 3px solid #10b981;">
          </div>

          <div class="form-group" style="margin-bottom: 0.65rem;">
            <label style="font-size: 0.8rem; font-weight: 700; color: #86efac;">Conclusiones de la Re-Inspección en Terreno:</label>
            <textarea id="hseObservacionesRehab" required rows="3" placeholder="Ej: Se constata la colocación de rodapié faltante y reemplazo de tablón. Estructura aplomada y apta para habilitación." style="width: 100%; padding: 0.45rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 0.82rem;"></textarea>
          </div>

          <div class="form-group" style="margin-bottom: 0.75rem; background: rgba(0,0,0,0.25); border: 1px dashed #10b981; border-radius: 6px; padding: 0.65rem;">
            <label style="font-size: 0.8rem; font-weight: 700; color: #86efac; display: block; margin-bottom: 0.35rem;">
              📷 Foto de Verificación de la Subsanación (Opcional):
            </label>
            <input type="file" id="hseRehabFotoInput" accept="image/*" capture="environment" style="font-size: 0.8rem;" onchange="handleHSERehabFotoUpload(event)">
            <div id="hseRehabFotoPreviewBox" style="margin-top: 0.5rem; text-align: center; display: none;">
              <img id="hseRehabFotoImg" src="" alt="Foto Verificación" style="max-width: 100%; max-height: 160px; border-radius: 6px; border: 1px solid #10b981;">
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
            <button type="button" class="btn btn-outline btn-sm" onclick="cerrarModalRehabilitarHSE()">Cancelar</button>
            <button type="submit" class="btn btn-sm" style="background: #10b981; color: #fff; padding: 0.4rem 0.8rem; font-weight: 700;">
              🟢 Re-Habilitar Oficialmente (Tarjeta Verde)
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========================================================
         MODAL 3: REPORTAR SUBSANACIÓN (EMPRESA CONTRATISTA)
         ======================================================== -->
    <div id="modalSubsanarHSE" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; align-items: center; justify-content: center; padding: 1rem;">
      <div style="background: var(--bg-card); border: 2px solid #f59e0b; border-radius: 10px; max-width: 500px; width: 100%; padding: 1.25rem; box-shadow: 0 10px 40px rgba(245,158,11,0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid #f59e0b; padding-bottom: 0.5rem;">
          <h3 id="subsanarTituloHSE" style="margin: 0; font-size: 1.1rem; color: #fde047; display: flex; align-items: center; gap: 0.5rem;">
            🔧 Reportar Subsanación de Andamio (Contratista)
          </h3>
          <button type="button" class="btn btn-outline btn-sm" onclick="cerrarModalSubsanarHSE()">✖</button>
        </div>

        <form onsubmit="handleSubsanarHSESubmit(event)">
          <input type="hidden" id="subsanarSolId">
          <input type="hidden" id="hseSubsanarFotoUrl">

          <div id="subsanarInfoBox" style="background: rgba(0,0,0,0.3); padding: 0.5rem 0.75rem; border-radius: 6px; margin-bottom: 0.75rem; font-size: 0.82rem; border-left: 3px solid #f59e0b;">
          </div>

          <div class="form-group" style="margin-bottom: 0.65rem;">
            <label style="font-size: 0.8rem; font-weight: 700; color: #fde047;">Detalle de Modificaciones y Reparaciones Realizadas:</label>
            <textarea id="hseDetalleSubsanacion" required rows="3" placeholder="Ej: Se instalaron los rodapiés faltantes en la plataforma y se ajustaron las trabas de seguridad..." style="width: 100%; padding: 0.45rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 0.82rem;"></textarea>
          </div>

          <div class="form-group" style="margin-bottom: 0.75rem; background: rgba(0,0,0,0.25); border: 1px dashed #f59e0b; border-radius: 6px; padding: 0.65rem;">
            <label style="font-size: 0.8rem; font-weight: 700; color: #fde047; display: block; margin-bottom: 0.35rem;">
              📷 Foto de la Modificación / Andamio Corregido:
            </label>
            <input type="file" id="hseSubsanarFotoInput" accept="image/*" capture="environment" style="font-size: 0.8rem;" onchange="handleHSESubsanarFotoUpload(event)">
            <div id="hseSubsanarFotoPreviewBox" style="margin-top: 0.5rem; text-align: center; display: none;">
              <img id="hseSubsanarFotoImg" src="" alt="Foto Subsanación" style="max-width: 100%; max-height: 160px; border-radius: 6px; border: 1px solid #f59e0b;">
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
            <button type="button" class="btn btn-outline btn-sm" onclick="cerrarModalSubsanarHSE()">Cancelar</button>
            <button type="submit" class="btn btn-sm" style="background: #f59e0b; color: #000; padding: 0.4rem 0.8rem; font-weight: 800;">
              🔧 Enviar Reporte de Subsanación
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========================================================
         MODAL 4: VISUALIZADOR DE EVIDENCIA FOTOGRÁFICA
         ======================================================== -->
    <div id="modalFotoHSE" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 1100; align-items: center; justify-content: center; padding: 1rem;" onclick="cerrarModalFotoHSE()">
      <div style="max-width: 700px; width: 100%; text-align: center;" onclick="event.stopPropagation()">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; color: #fff;">
          <h4 id="modalFotoHSETitulo" style="margin: 0; font-size: 1rem;">📷 Registro Fotográfico HSE</h4>
          <button type="button" class="btn btn-outline btn-sm" onclick="cerrarModalFotoHSE()">✖ Cerrar</button>
        </div>
        <img id="modalFotoHSEImg" src="" alt="Registro Fotográfico" style="max-width: 100%; max-height: 75vh; border-radius: 8px; border: 2px solid var(--border); box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
      </div>
    </div>
  `;
}

/* ========================================================
   HANDLERS Y FUNCIONES OPERATIVAS DE SEGURIDAD E HIGIENE
   ======================================================== */

window.filtrarTablaSeguridadHSE = () => {
  const estadoFiltro = document.getElementById('filtroEstadoHSE')?.value || 'TODOS';
  const query = (document.getElementById('filtroSeguridadInput')?.value || '').toLowerCase().trim();
  const filas = document.querySelectorAll('#tablaSeguridadHSE tbody tr');

  filas.forEach(f => {
    const texto = f.textContent.toLowerCase();
    const coincideTexto = !query || texto.includes(query);

    let coincideEstado = true;
    if (estadoFiltro === 'DESHABILITADOS') {
      coincideEstado = f.classList.contains('fila-deshabilitada') || texto.includes('deshabilitado');
    } else if (estadoFiltro === 'SUBSANADOS') {
      coincideEstado = texto.includes('corrección reportada');
    } else if (estadoFiltro === 'HABILITADOS') {
      coincideEstado = texto.includes('habilitado') && !f.classList.contains('fila-deshabilitada');
    }

    f.style.display = (coincideTexto && coincideEstado) ? '' : 'none';
  });
};

window.verFotoEvidencia = (url, correlativo) => {
  const modal = document.getElementById('modalFotoHSE');
  const img = document.getElementById('modalFotoHSEImg');
  const tit = document.getElementById('modalFotoHSETitulo');
  if (!modal || !img) return;

  img.src = url;
  if (tit) tit.textContent = `📷 Registro Fotográfico - Andamio N° ${correlativo || ''}`;
  modal.style.display = 'flex';
};

window.cerrarModalFotoHSE = () => {
  const modal = document.getElementById('modalFotoHSE');
  if (modal) modal.style.display = 'none';
};

// Subida de foto en modal de Deshabilitación
window.handleHSEFotoUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const previewBox = document.getElementById('hseFotoPreviewBox');
  const img = document.getElementById('hseFotoImg');
  const inputUrl = document.getElementById('hseFotoUrl');

  const formData = new FormData();
  formData.append('foto', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    }).then(r => r.json());

    if (res.ok) {
      if (inputUrl) inputUrl.value = res.url;
      if (img) img.src = res.url;
      if (previewBox) previewBox.style.display = 'block';
    } else {
      alert('Error al subir imagen: ' + res.error);
    }
  } catch (err) {
    alert('Fallo de conexión al subir la fotografía.');
  }
};

window.abrirModalDeshabilitarHSE = (solicitudId) => {
  const sol = (AppState.todasSolicitudesGestionador || []).find(s => s.id === solicitudId);
  if (!sol) return;

  document.getElementById('deshabilitarSolId').value = sol.id;
  document.getElementById('deshabilitarTituloHSE').textContent = `🚫 Deshabilitar Andamio N° ${sol.numeroCorrelativo}`;
  document.getElementById('deshabilitarInfoBox').innerHTML = `
    <strong>Andamio:</strong> ${sol.numeroCorrelativo} | <strong>Tarjeta:</strong> ${sol.tarjetaId}<br>
    <strong>Ubicación:</strong> ${sol.ubicacionTecnica} (${sol.sector}) | <strong>Contratista:</strong> ${sol.proveedorAsignado || 'N/A'}
  `;
  document.getElementById('hseFotoUrl').value = '';
  document.getElementById('hseDetalleObservacion').value = '';
  document.getElementById('hseFotoPreviewBox').style.display = 'none';
  document.getElementById('hseFotoInputFile').value = '';

  const chks = document.querySelectorAll('.chk-hse-deficiencia');
  chks.forEach(c => c.checked = false);

  const inspectorInput = document.getElementById('hseInspectorNombre');
  if (inspectorInput) inspectorInput.value = `${AppState.currentUser?.nombre || 'Lic. Roberto Varela'} (Seguridad HSE ARAUCO)`;

  document.getElementById('modalDeshabilitarHSE').style.display = 'flex';
};

window.cerrarModalDeshabilitarHSE = () => {
  const modal = document.getElementById('modalDeshabilitarHSE');
  if (modal) modal.style.display = 'none';
};

window.handleDeshabilitarHSESubmit = async (e) => {
  e.preventDefault();
  const solId = document.getElementById('deshabilitarSolId').value;
  const motivo = document.getElementById('hseMotivoPrincipal').value;
  const observaciones = document.getElementById('hseDetalleObservacion').value;
  const fotoEvidencia = document.getElementById('hseFotoUrl').value;
  const inspectorNombre = document.getElementById('hseInspectorNombre').value;

  const chks = document.querySelectorAll('.chk-hse-deficiencia:checked');
  const itemsObservados = Array.from(chks).map(c => c.value);

  try {
    const res = await fetch(`/api/seguridad/deshabilitar/${solId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motivo,
        itemsObservados,
        observaciones,
        fotoEvidencia,
        inspectorNombre
      })
    }).then(r => r.json());

    if (res.ok) {
      alert(`⛔ ANDAMIO ${res.solicitud.numeroCorrelativo} DESHABILITADO EXITOSAMENTE.\n\nSe emitió la Tarjeta Roja de Seguridad y se registró la fotografía del evento en la base central.`);
      cerrarModalDeshabilitarHSE();
      await renderPortalGestionador(document.getElementById('appContainer'), AppState.currentUser);
    } else {
      alert('Error: ' + res.error);
    }
  } catch (err) {
    alert('Fallo de conexión al deshabilitar el andamio.');
  }
};

// Modal de Re-Habilitación
window.abrirModalRehabilitarHSE = (solicitudId) => {
  const sol = (AppState.todasSolicitudesGestionador || []).find(s => s.id === solicitudId);
  if (!sol) return;

  document.getElementById('rehabilitarSolId').value = sol.id;
  document.getElementById('rehabilitarTituloHSE').textContent = `🟢 Re-Habilitar Andamio N° ${sol.numeroCorrelativo}`;

  const ev = sol.eventoSeguridadHSE;
  document.getElementById('rehabilitarInfoBox').innerHTML = `
    <strong>Andamio:</strong> ${sol.numeroCorrelativo} | <strong>Tarjeta:</strong> ${sol.tarjetaId}<br>
    <strong>Ubicación:</strong> ${sol.ubicacionTecnica} (${sol.sector})<br>
    ${ev ? `<div style="margin-top: 4px; color: #fca5a5;"><strong>Motivo previo de bloqueo:</strong> ${ev.motivoPrincipal || ''}</div>` : ''}
    ${ev?.subsanacionContratista ? `<div style="margin-top: 4px; color: #fef08a;"><strong>Subsanación informada:</strong> ${ev.subsanacionContratista.detalle}</div>` : ''}
  `;
  document.getElementById('hseObservacionesRehab').value = '';
  document.getElementById('hseRehabFotoUrl').value = '';
  document.getElementById('hseRehabFotoPreviewBox').style.display = 'none';

  document.getElementById('modalRehabilitarHSE').style.display = 'flex';
};

window.cerrarModalRehabilitarHSE = () => {
  const modal = document.getElementById('modalRehabilitarHSE');
  if (modal) modal.style.display = 'none';
};

window.handleHSERehabFotoUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('foto', file);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData }).then(r => r.json());
    if (res.ok) {
      document.getElementById('hseRehabFotoUrl').value = res.url;
      document.getElementById('hseRehabFotoImg').src = res.url;
      document.getElementById('hseRehabFotoPreviewBox').style.display = 'block';
    }
  } catch (err) {
    alert('Error al subir foto de verificación');
  }
};

window.handleRehabilitarHSESubmit = async (e) => {
  e.preventDefault();
  const solId = document.getElementById('rehabilitarSolId').value;
  const observacionesRehabilitacion = document.getElementById('hseObservacionesRehab').value;
  const fotoVerificacion = document.getElementById('hseRehabFotoUrl').value;

  try {
    const res = await fetch(`/api/seguridad/rehabilitar/${solId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inspectorNombre: AppState.currentUser?.nombre || 'Lic. Roberto Varela',
        observacionesRehabilitacion,
        fotoVerificacion
      })
    }).then(r => r.json());

    if (res.ok) {
      alert(`🟢 ANDAMIO ${res.solicitud.numeroCorrelativo} RE-HABILITADO EXITOSAMENTE.\n\nSe restableció la Tarjeta Verde de Seguridad.`);
      cerrarModalRehabilitarHSE();
      await renderPortalGestionador(document.getElementById('appContainer'), AppState.currentUser);
    } else {
      alert('Error: ' + res.error);
    }
  } catch (err) {
    alert('Fallo de conexión al re-habilitar');
  }
};

// Modal de Subsanación (Contratista)
window.abrirModalSubsanarHSE = (solicitudId) => {
  const sol = (AppState.todasSolicitudesGestionador || []).find(s => s.id === solicitudId) ||
    (AppState.ordenesEjecutante || []).find(s => s.id === solicitudId);
  if (!sol) return;

  document.getElementById('subsanarSolId').value = sol.id;
  document.getElementById('subsanarTituloHSE').textContent = `🔧 Subsanar Andamio N° ${sol.numeroCorrelativo}`;

  const ev = sol.eventoSeguridadHSE;
  document.getElementById('subsanarInfoBox').innerHTML = `
    <strong>Andamio:</strong> ${sol.numeroCorrelativo} | <strong>Ubicación:</strong> ${sol.ubicacionTecnica}<br>
    ${ev ? `<div style="color: #fca5a5; margin-top: 3px;"><strong>No-conformidad a reparar:</strong> ${ev.motivoPrincipal}<br>${ev.observaciones || ''}</div>` : ''}
  `;
  document.getElementById('hseDetalleSubsanacion').value = '';
  document.getElementById('hseSubsanarFotoUrl').value = '';
  document.getElementById('hseSubsanarFotoPreviewBox').style.display = 'none';

  document.getElementById('modalSubsanarHSE').style.display = 'flex';
};

window.cerrarModalSubsanarHSE = () => {
  const modal = document.getElementById('modalSubsanarHSE');
  if (modal) modal.style.display = 'none';
};

window.handleHSESubsanarFotoUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('foto', file);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData }).then(r => r.json());
    if (res.ok) {
      document.getElementById('hseSubsanarFotoUrl').value = res.url;
      document.getElementById('hseSubsanarFotoImg').src = res.url;
      document.getElementById('hseSubsanarFotoPreviewBox').style.display = 'block';
    }
  } catch (err) {
    alert('Error al subir foto de subsanación');
  }
};

window.handleSubsanarHSESubmit = async (e) => {
  e.preventDefault();
  const solId = document.getElementById('subsanarSolId').value;
  const detalleSubsanacion = document.getElementById('hseDetalleSubsanacion').value;
  const fotoSubsanacion = document.getElementById('hseSubsanarFotoUrl').value;

  try {
    const res = await fetch(`/api/seguridad/subsanar/${solId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        responsableNombre: AppState.currentUser?.nombre || 'Contratista',
        detalleSubsanacion,
        fotoSubsanacion
      })
    }).then(r => r.json());

    if (res.ok) {
      alert(`🔧 REPORTE DE SUBSANACIÓN CARGADO EXITOSAMENTE.\n\nEl andamio ${res.solicitud.numeroCorrelativo} queda a la espera de verificación por Seguridad HSE para su re-habilitación.`);
      cerrarModalSubsanarHSE();
      await renderPortalGestionador(document.getElementById('appContainer'), AppState.currentUser);
    } else {
      alert('Error: ' + res.error);
    }
  } catch (err) {
    alert('Fallo al enviar reporte de subsanación');
  }
};

window.abrirModalSolicitarReforma = (solicitudId) => {
  const sol = (AppState.todasSolicitudesGestionador || []).find(s => s.id === solicitudId) ||
    (AppState.misSolicitudes || []).find(s => s.id === solicitudId);
  if (!sol) return;

  const m3Actual = sol.totalVolumenRealM3 || sol.dimSolicitadaAndamio?.volumenM3 || 0;
  const m2Actual = sol.totalSuperficieRealM2 || sol.dimSolicitadaPlataforma?.superficieM2 || 0;

  const m3Adic = prompt(`Solicitar Reforma / Ampliación para Andamio N° ${sol.numeroCorrelativo}\nMetraje actual: ${m3Actual} m³ / ${m2Actual} m²\n\nIngrese metros cúbicos (m³) adicionales a incorporar:`, '8.0');
  if (m3Adic === null) return;

  const m2Adic = prompt(`Ingrese metros cuadrados (m²) adicionales de plataformas:`, '4.0');
  if (m2Adic === null) return;

  const motivo = prompt(`Motivo / Justificación técnica de la reforma:`, 'Ampliación de estructura para nuevo punto de trabajo en altura');
  if (motivo === null) return;

  solicitarReformaBackend(sol.id, parseFloat(m3Adic), parseFloat(m2Adic), motivo);
};

async function solicitarReformaBackend(solId, m3Adicionales, m2Adicionales, motivo) {
  try {
    const res = await fetch(`/api/solicitudes/${solId}/solicitar-reforma`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        solicitanteNombre: AppState.currentUser?.nombre || '',
        m3Adicionales,
        m2Adicionales,
        motivo
      })
    }).then(r => r.json());

    if (res.ok) {
      alert(`✅ Reforma solicitada exitosamente para ${res.solicitud.numeroCorrelativo}.\nSe agregaron ${m3Adicionales} m³ y ${m2Adicionales} m² a la orden.`);
      renderPortalPorRol();
    } else {
      alert('Error: ' + res.error);
    }
  } catch (err) {
    alert('Fallo de conexión al solicitar reforma');
  }
}

/* ========================================================
   PORTAL DE LA EMPRESA EJECUTORA
   ======================================================== */
async function renderPortalEjecutante(container, user) {
  try {
    const [resSol, resMet] = await Promise.all([
      fetch(`/api/solicitudes?rol=EMPRESA_SERVICIO&empresaNombre=${encodeURIComponent(user.empresaNombre || '')}`).then(r => r.json()),
      fetch(`/api/ejecutante/metricas/${encodeURIComponent(user.empresaNombre || '')}`).then(r => r.json())
    ]);

    if (resSol.ok) AppState.ordenesEjecutante = resSol.solicitudes;
    if (resMet.ok) AppState.metricasEjecutante = resMet.metricas;
  } catch (err) {
    console.error('Error cargando datos del ejecutante:', err);
  }

  const m = AppState.metricasEjecutante || {
    totalAsignados: 0, pendientesArmar: 0, activos: 0, pendientesDesarmar: 0, desarmados: 0, m3Ejecutados: 0, m2Ejecutados: 0
  };

  container.innerHTML = `
    <div class="info-card dashboard-hero">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
        <div>
          <h2 style="margin: 0; font-size: 1.15rem; color: #fff;">👷 Portal de Empresa Ejecutora / Contratista</h2>
          <p style="color: var(--text-muted); font-size: 0.78rem; margin: 0.2rem 0 0 0;">
            Empresa Asignada: <strong>${user.empresaNombre || 'Contratista Externa'}</strong> | Supervisor: <strong>${user.nombre}</strong>
          </p>
        </div>
      </div>

      <!-- Métricas abajo en 4 columnas completas -->
      <div class="header-kpis-grid">
        <div class="calc-box-compact">
          <div class="calc-val" style="color: #38bdf8;">${m.pendientesArmar}</div>
          <div class="calc-label">Para Armar</div>
        </div>
        <div class="calc-box-compact">
          <div class="calc-val" style="color: #10b981;">${m.activos}</div>
          <div class="calc-label">Activos / Hab.</div>
        </div>
        <div class="calc-box-compact">
          <div class="calc-val" style="color: #f59e0b;">${m.pendientesDesarmar}</div>
          <div class="calc-label">Para Desarmar</div>
        </div>
        <div class="calc-box-compact">
          <div class="calc-val" style="color: #a855f7;">${m.m3Ejecutados} m³</div>
          <div class="calc-label">Metraje Ejecutado</div>
        </div>
      </div>
    </div>

    <div class="tabs-nav">
      <button class="tab-btn ${AppState.activeTabEjecutante === 'ordenes' ? 'active' : ''}" onclick="cambiarTabEjecutante('ordenes')">
        📦 1. Órdenes (${m.pendientesArmar})
      </button>
      <button class="tab-btn ${AppState.activeTabEjecutante === 'desarmes' ? 'active' : ''}" onclick="cambiarTabEjecutante('desarmes')">
        🔧 2. Desarmes (${m.pendientesDesarmar})
      </button>
      <button class="tab-btn ${AppState.activeTabEjecutante === 'produccion' ? 'active' : ''}" onclick="cambiarTabEjecutante('produccion')">
        📊 3. Mi Producción (${m.totalAsignados})
      </button>
    </div>

    <div id="tabContentEjecutante"></div>
  `;

  renderContenidoTabEjecutante();
}

window.cambiarTabEjecutante = (tab) => {
  AppState.activeTabEjecutante = tab;
  renderPortalPorRol();
};

function renderContenidoTabEjecutante() {
  const container = document.getElementById('tabContentEjecutante');
  if (!container) return;
  if (AppState.activeTabEjecutante === 'ordenes') renderOrdenesMontajeEjecutante(container);
  else if (AppState.activeTabEjecutante === 'desarmes') renderOrdenesDesarmeEjecutante(container);
  else if (AppState.activeTabEjecutante === 'produccion') renderMiProduccionEjecutante(container);
}

function renderOrdenesMontajeEjecutante(container) {
  const list = AppState.ordenesEjecutante.filter(s => ['PROGRAMADO', 'EN_SITIO', 'IMPEDIDO'].includes(s.estado));

  container.innerHTML = `
    <div class="info-card">
      <div style="border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <h3>📦 Órdenes de Montaje Asignadas por el Gestionador</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem;">
          Lee las indicaciones del Gestionador. Confirma recepción ("En Sitio"), reporta impedimentos con foto o procede con la habilitación reglamentaria.
        </p>
      </div>

      ${list.length === 0 ? `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No tienes órdenes de montaje pendientes en este momento.
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${list.map(s => {
    const vol = s.dimSolicitadaAndamio?.volumenM3 || 0;
    const sup = s.dimSolicitadaPlataforma?.superficieM2 || 0;
    return `
              <div style="background-color: var(--bg-card); border: 2px solid ${s.estado === 'IMPEDIDO' ? '#ef4444' : (s.estado === 'EN_SITIO' ? '#06b6d4' : 'var(--border)')}; border-radius: 8px; padding: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
                  <div>
                    <span class="status-badge ${s.estado.toLowerCase()}">${s.estado}</span>
                    <span class="status-badge ${s.tipoOperacion === 'ANUAL' ? 'solicitado' : 'programado'}">${s.tipoOperacion}</span>
                    <span style="font-weight: 800; font-size: 1.1rem; margin-left: 0.5rem;">${s.numeroCorrelativo}</span>
                    <span style="color: var(--arauco-accent); font-size: 0.9rem;">(${s.tarjetaId})</span>
                  </div>
                  <div>
                    <span style="color: var(--warning); font-weight: 700;">Prioridad: ${s.prioridad || 'NORMAL'}</span> · 
                    <small style="color: var(--text-muted);">Prog: ${s.fechaProgramada || 'Hoy'}</small>
                  </div>
                </div>

                <div class="grid-3" style="font-size: 0.85rem; margin-bottom: 1rem;">
                  <div>
                    <span style="color: var(--text-muted);">Ubicación Técnica:</span><br>
                    <strong style="font-size: 0.95rem;">${s.ubicacionTecnica}</strong><br>
                    <small style="color: var(--text-muted);">${s.sector} · CC: ${s.centroCostos}</small>
                  </div>
                  <div>
                    <span style="color: var(--text-muted);">Solicitante:</span><br>
                    <strong>${s.solicitanteNombre}</strong> (Legajo: ${s.legajo})<br>
                    <small style="color: var(--text-muted);">Motivo: ${s.motivo}</small>
                  </div>
                  <div>
                    <span style="color: var(--text-muted);">Dimensiones Solicitadas:</span><br>
                    <strong style="color: #38bdf8;">${vol} m³</strong> · <strong style="color: #4ade80;">${sup} m²</strong><br>
                    <small style="color: var(--text-muted);">Tipo: ${(s.tiposAndamio || []).join(', ')}</small>
                  </div>
                </div>

                <div style="background-color: rgba(27, 67, 50, 0.3); border-left: 4px solid var(--arauco-accent); padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem;">
                  <strong style="color: var(--arauco-accent); font-size: 0.85rem;">📋 INDICACIONES DEL GESTIONADOR ARAUCO:</strong>
                  <p style="font-size: 0.9rem; margin-top: 0.25rem;">
                    ${s.indicacionesGestionador || 'Sin indicaciones especiales. Cumplir normas de seguridad ARAUCO y checklist de 11 puntos.'}
                  </p>
                </div>

                ${s.estado === 'IMPEDIDO' && s.incidenteArea ? `
                  <div style="background-color: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem;">
                    <strong style="color: #ef4444;">⚠️ ÁREA SIN CONDICIONES REPORTADA:</strong> ${s.incidenteArea.causal}<br>
                    <small>${s.incidenteArea.comentario || 'A la espera de liberación por el sector.'}</small>
                  </div>
                ` : ''}

                <div style="display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap; border-top: 1px solid var(--border); padding-top: 0.75rem;">
                  ${s.estado === 'PROGRAMADO' ? `
                    <button class="btn btn-outline btn-sm" onclick="darAcuseRecibo('${s.id}')">
                      👁️ Acuse de Recibo / Iniciar en Sitio
                    </button>
                  ` : ''}

                  <button class="btn btn-outline btn-sm" onclick="imprimirPlanillaOficialARAUCO('${s.id}')" title="Ver planilla oficial ARAUCO">
                    📄 Planilla
                  </button>

                  <button class="btn btn-outline btn-sm" style="border-color: #ef4444; color: #ef4444;" onclick="abrirModalImpedimento('${s.id}')">
                    ⚠️ Reportar "Área Sin Condiciones"
                  </button>

                  <button class="btn btn-sm" onclick="abrirModalHabilitacion('${s.id}')">
                    🟢 Montar, Habilitar & Emitir Tarjeta
                  </button>
                </div>
              </div>
            `;
  }).join('')}
        </div>
      `}
    </div>

    <!-- Modal para Reportar Área Sin Condiciones -->
    <div id="modalImpedimento" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center; padding: 1rem;">
      <div class="auth-wrapper" style="max-width: 500px; margin: 0; width: 100%;">
        <h3 style="color: #ef4444;">⚠️ Notificar Área Sin Condiciones</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
          Informa al Gestionador y al Solicitante por qué no se pudo iniciar el armado en el sector.
        </p>

        <form id="formImpedimento" onsubmit="guardarImpedimento(event)">
          <input type="hidden" id="impSolId">

          <div class="form-group">
            <label>Causal Principal del Impedimento</label>
            <select id="impCausal" required>
              <option value="Acceso obstruido / interferencia de materiales">Acceso obstruido / interferencia de materiales</option>
              <option value="Equipo en marcha / temperatura / riesgo operativo">Equipo en marcha / temperatura / riesgo operativo</option>
              <option value="Falta de permiso de trabajo / bloqueo LOTOTO pendiente">Falta de permiso de trabajo / bloqueo LOTOTO pendiente</option>
              <option value="Piso/área sin capacidad portante o sin limpieza industrial">Piso/área sin capacidad portante o sin limpieza industrial</option>
              <option value="Otro motivo de seguridad">Otro motivo de seguridad</option>
            </select>
          </div>

          <div class="form-group">
            <label>Observaciones Detalladas</label>
            <textarea id="impComentario" rows="3" placeholder="Describe la condición encontrada en el lugar..." required></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
            <button type="button" class="btn btn-outline" onclick="document.getElementById('modalImpedimento').style.display='none'">Cancelar</button>
            <button type="submit" class="btn btn-danger">⚠️ Notificar Impedimento</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Completo de Habilitación y Dimensiones Reales -->
    <div id="modalHabilitacion" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; align-items: flex-start; justify-content: center; padding: 1.5rem; overflow-y: auto;">
      <div class="info-card" style="max-width: 900px; width: 100%; margin: 0 auto; background: var(--bg-dark);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 1rem;">
          <div>
            <h3 style="color: var(--arauco-accent);">🟢 Habilitación Oficial de Andamio en Terreno</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem;" id="habTituloSub">
              Carga de Dimensiones Reales (m³/m²), Checklist de 11 Puntos de ARAUCO y Emisión de Tarjeta
            </p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="cerrarModalHabilitacion()">✖ Cerrar</button>
        </div>

        <form id="formHabilitarAndamio" onsubmit="guardarHabilitacionAndamio(event)">
          <input type="hidden" id="habSolId">

          <div style="background-color: var(--bg-card); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h4 style="color: #38bdf8;">1. DIMENSIONES REALES DEL ANDAMIO (m³)</h4>
              <button type="button" class="btn btn-outline btn-sm" onclick="agregarFilaRealAndamio()">+ Agregar Tramo</button>
            </div>
            <div class="table-responsive">
              <table id="tablaRealAndamio">
                <thead>
                  <tr>
                    <th>Ancho (m)</th>
                    <th>Largo (m)</th>
                    <th>Alto (m)</th>
                    <th>Volumen (m³)</th>
                    <th style="width: 40px;"></th>
                  </tr>
                </thead>
                <tbody id="bodyRealAndamio"></tbody>
              </table>
            </div>
            <div style="text-align: right; margin-top: 0.5rem; font-weight: 800; font-size: 1.1rem; color: #38bdf8;" id="totalRealAndamioM3">
              Total Andamio: 0.00 m³
            </div>
          </div>

          <div style="background-color: var(--bg-card); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h4 style="color: #4ade80;">2. DIMENSIONES REALES DE PLATAFORMAS (m²)</h4>
              <button type="button" class="btn btn-outline btn-sm" onclick="agregarFilaRealPlat()">+ Agregar Nivel</button>
            </div>
            <div class="table-responsive">
              <table id="tablaRealPlataforma">
                <thead>
                  <tr>
                    <th>N° Plat. (cant)</th>
                    <th>Ancho (m)</th>
                    <th>Largo (m)</th>
                    <th>Superficie (m²)</th>
                    <th style="width: 40px;"></th>
                  </tr>
                </thead>
                <tbody id="bodyRealPlataforma"></tbody>
              </table>
            </div>
            <div style="text-align: right; margin-top: 0.5rem; font-weight: 800; font-size: 1.1rem; color: #4ade80;" id="totalRealPlatM2">
              Total Plataformas: 0.00 m²
            </div>
          </div>

          <div class="grid-3" style="background-color: var(--bg-card); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 1rem;">
            <div class="form-group">
              <label>Régimen Horario Real de Montaje</label>
              <select id="habRegimenReal" required>
                <option value="HABILES">Días Hábiles (Jornada normal)</option>
                <option value="SABADO_NOCTURNO">Sábados y Nocturno</option>
                <option value="DOMINGO_FERIADO">Domingo y Feriado</option>
              </select>
            </div>
            <div class="form-group">
              <label>Ítem Especial Calderas (CR / CP)</label>
              <select id="habItemEspecial">
                <option value="NINGUNO">Ninguno (Estándar)</option>
                <option value="PISO_INF_CR">Pisos de seguridad INF CR</option>
                <option value="PISO_SUP_CR">Pisos de seguridad SUP CR</option>
                <option value="PISO_CP">Pisos de seguridad CP</option>
                <option value="GRILLA_MOVIL_CP">Entablonado Grilla móvil CP</option>
              </select>
            </div>
            <div class="form-group">
              <label>N° de Tarjeta Física / Precinto</label>
              <input type="text" id="habNTarjeta" placeholder="Ej. TARJ-5117" required>
            </div>
          </div>

          <div style="background-color: var(--bg-card); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 1rem;">
            <h4 style="color: var(--warning); margin-bottom: 0.5rem;">3. CHECK LIST PARA HABILITACIÓN DE ANDAMIOS (OFICIAL ARAUCO)</h4>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Requisito de Seguridad</th>
                    <th style="width: 60px; text-align: center;">SI</th>
                    <th style="width: 60px; text-align: center;">NO</th>
                    <th style="width: 60px; text-align: center;">NA</th>
                  </tr>
                </thead>
                <tbody>
                  ${CHECKLIST_11_PUNTOS.map((chk, idx) => `
                    <tr>
                      <td style="font-size: 0.85rem;">${idx + 1}. ${chk}</td>
                      <td style="text-align: center;">
                        <input type="radio" name="chk_${idx}" value="SI" checked required>
                      </td>
                      <td style="text-align: center;">
                        <input type="radio" name="chk_${idx}" value="NO">
                      </td>
                      <td style="text-align: center;">
                        <input type="radio" name="chk_${idx}" value="NA">
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- 4. REGISTRO FOTOGRÁFICO OBLIGATORIO DEL ANDAMIO MONTADO -->
          <div style="background-color: var(--bg-card); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <h4 style="color: #38bdf8; margin: 0; display: flex; align-items: center; gap: 0.4rem; font-size: 0.95rem;">
                <span>📷 4. REGISTRO FOTOGRÁFICO DEL ANDAMIO MONTADO</span>
                <span style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
                  REQUISITO OBLIGATORIO
                </span>
              </h4>
              <button type="button" class="btn btn-outline btn-sm" onclick="cargarFotoPruebaHabilitacion()" style="font-size: 0.74rem; padding: 0.25rem 0.55rem; color: #38bdf8; border-color: #38bdf8;">
                🖼️ Cargar Foto Demo de Terreno
              </button>
            </div>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin-bottom: 0.75rem;">
              Capture con la cámara de su celular o suba un archivo fotográfico donde se aprecie la estructura completa montada, bases, arriostramientos y accesos seguros.
            </p>

            <!-- Zona de Carga / Selección de Foto -->
            <div style="border: 2px dashed #38bdf8; border-radius: 8px; padding: 1.25rem; text-align: center; background: rgba(56, 189, 248, 0.05); cursor: pointer; transition: all 0.2s;" onclick="document.getElementById('inputFotoMontaje').click()">
              <input type="file" id="inputFotoMontaje" accept="image/*" capture="environment" style="display: none;" onchange="handleFotoMontajeSeleccionada(event)">
              
              <div id="habFotoPlaceholder">
                <div style="font-size: 2.2rem; margin-bottom: 0.35rem;">📸</div>
                <div style="font-weight: 700; color: #fff; font-size: 0.9rem;">Haga clic aquí para Tomar Foto o Subir Archivo</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Formatos aceptados: JPG, PNG, WEBP (cámara móvil o galería)</div>
              </div>

              <div id="habFotoPreviewContainer" style="display: none; position: relative;">
                <img id="habFotoPreviewImg" src="" alt="Vista previa andamio montado" style="max-height: 240px; max-width: 100%; border-radius: 6px; border: 2px solid #10b981; object-fit: contain; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                <div style="margin-top: 0.6rem; display: flex; justify-content: center; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
                  <span class="status-badge activo" style="font-size: 0.75rem; background: rgba(16, 185, 129, 0.2); color: #4ade80; border: 1px solid #10b981;">
                    ✅ Fotografía de montaje cargada correctamente
                  </span>
                  <button type="button" class="btn btn-outline btn-sm" onclick="event.stopPropagation(); document.getElementById('inputFotoMontaje').click();" style="font-size: 0.72rem; padding: 0.2rem 0.55rem;">
                    🔄 Cambiar Foto
                  </button>
                  <button type="button" class="btn btn-danger btn-sm" onclick="event.stopPropagation(); limpiarFotoHabilitacion();" style="font-size: 0.72rem; padding: 0.2rem 0.55rem;">
                    🗑️ Quitar
                  </button>
                </div>
              </div>
            </div>
            <input type="hidden" id="habFotoBase64" required>
          </div>

          <div style="background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: #fff;">
              <input type="checkbox" id="chkDeclaracionHabilitado" required style="width: auto;">
              <span><strong>DECLARACIÓN:</strong> Certifico que el andamio se encuentra <strong>COMPLETO, EN CONDICIONES SEGURAS Y HABILITADO</strong> para su uso en planta.</span>
            </label>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" class="btn btn-outline" onclick="cerrarModalHabilitacion()">Cancelar</button>
            <button type="submit" class="btn" style="padding: 0.75rem 1.5rem;">
              🏷️ Habilitar Andamio & Generar Tarjeta QR
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

window.darAcuseRecibo = async (solicitudId) => {
  const supervisor = prompt('Nombre del Supervisor o Capataz en Sitio:', AppState.currentUser.nombre);
  if (!supervisor) return;

  try {
    const res = await fetch(`/api/ejecutante/acuse-recibo/${solicitudId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supervisorNombre: supervisor })
    }).then(r => r.json());

    if (res.ok) {
      alert(`✅ Acuse de recibo registrado. Estado: EN SITIO.`);
      renderPortalPorRol();
    } else {
      alert('Error: ' + res.error);
    }
  } catch (err) {
    alert('Fallo de conexión');
  }
};

window.abrirModalImpedimento = (solicitudId) => {
  document.getElementById('impSolId').value = solicitudId;
  document.getElementById('modalImpedimento').style.display = 'flex';
};

window.guardarImpedimento = async (e) => {
  e.preventDefault();
  const id = document.getElementById('impSolId').value;
  const causal = document.getElementById('impCausal').value;
  const comentario = document.getElementById('impComentario').value;

  try {
    const res = await fetch(`/api/ejecutante/reportar-impedimento/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ causal, comentario, reportadoPor: AppState.currentUser.nombre })
    }).then(r => r.json());

    if (res.ok) {
      alert(`⚠️ Notificación de Área Sin Condiciones registrada. El Gestionador fue alertado.`);
      document.getElementById('modalImpedimento').style.display = 'none';
      renderPortalPorRol();
    } else {
      alert('Error: ' + res.error);
    }
  } catch (err) {
    alert('Fallo de conexión al reportar impedimento');
  }
};

window.abrirModalHabilitacion = (solicitudId) => {
  const sol = AppState.ordenesEjecutante.find(s => s.id === solicitudId);
  if (!sol) return;

  AppState.solicitudParaHabilitar = sol;
  document.getElementById('habSolId').value = sol.id;
  document.getElementById('habTituloSub').textContent = `Andamio N° ${sol.numeroCorrelativo} (${sol.tarjetaId}) · ${sol.ubicacionTecnica}`;
  document.getElementById('habNTarjeta').value = sol.nTarjetaFisica || `TARJ-${sol.numeroCorrelativo.split('-')[1] || '0000'}`;

  // Reiniciar estado de la foto obligatoria
  limpiarFotoHabilitacion();

  const bodyAnd = document.getElementById('bodyRealAndamio');
  const bodyPlat = document.getElementById('bodyRealPlataforma');
  bodyAnd.innerHTML = '';
  bodyPlat.innerHTML = '';

  const dAnd = sol.dimSolicitadaAndamio || { ancho: 2, largo: 2, alto: 2 };
  const dPlat = sol.dimSolicitadaPlataforma || { nPlat: 1, ancho: 2, largo: 2 };

  agregarFilaRealAndamio(dAnd.ancho, dAnd.largo, dAnd.alto);
  agregarFilaRealPlat(dPlat.nPlat, dPlat.ancho, dPlat.largo);

  document.getElementById('modalHabilitacion').style.display = 'flex';
};

window.cerrarModalHabilitacion = () => {
  document.getElementById('modalHabilitacion').style.display = 'none';
  limpiarFotoHabilitacion();
};

window.handleFotoMontajeSeleccionada = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 20 * 1024 * 1024) {
    alert('⚠️ La fotografía seleccionada supera los 20MB permitidos.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const base64 = event.target.result;
    document.getElementById('habFotoBase64').value = base64;
    document.getElementById('habFotoPreviewImg').src = base64;
    document.getElementById('habFotoPlaceholder').style.display = 'none';
    document.getElementById('habFotoPreviewContainer').style.display = 'block';
  };
  reader.readAsDataURL(file);
};

window.cargarFotoPruebaHabilitacion = () => {
  const demoUrl = '/solicitud_modelo_arauco.jpg';
  document.getElementById('habFotoBase64').value = demoUrl;
  document.getElementById('habFotoPreviewImg').src = demoUrl;
  document.getElementById('habFotoPlaceholder').style.display = 'none';
  document.getElementById('habFotoPreviewContainer').style.display = 'block';
};

window.limpiarFotoHabilitacion = () => {
  const input = document.getElementById('inputFotoMontaje');
  if (input) input.value = '';
  const hidden = document.getElementById('habFotoBase64');
  if (hidden) hidden.value = '';
  const ph = document.getElementById('habFotoPlaceholder');
  if (ph) ph.style.display = 'block';
  const prev = document.getElementById('habFotoPreviewContainer');
  if (prev) prev.style.display = 'none';
};

window.agregarFilaRealAndamio = (ancho = 2.0, largo = 2.0, alto = 2.0) => {
  const tbody = document.getElementById('bodyRealAndamio');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="number" step="0.01" min="0" class="real-and-ancho" value="${ancho}" oninput="recalcularTotalesReales()" style="padding: 0.35rem;"></td>
    <td><input type="number" step="0.01" min="0" class="real-and-largo" value="${largo}" oninput="recalcularTotalesReales()" style="padding: 0.35rem;"></td>
    <td><input type="number" step="0.01" min="0" class="real-and-alto" value="${alto}" oninput="recalcularTotalesReales()" style="padding: 0.35rem;"></td>
    <td class="real-and-vol" style="font-weight: 700; color: #38bdf8;">0.00 m³</td>
    <td><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove(); recalcularTotalesReales();">✖</button></td>
  `;
  tbody.appendChild(tr);
  recalcularTotalesReales();
};

window.agregarFilaRealPlat = (nPlat = 1, ancho = 2.0, largo = 2.0) => {
  const tbody = document.getElementById('bodyRealPlataforma');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="number" step="1" min="0" class="real-plat-n" value="${nPlat}" oninput="recalcularTotalesReales()" style="padding: 0.35rem;"></td>
    <td><input type="number" step="0.01" min="0" class="real-plat-ancho" value="${ancho}" oninput="recalcularTotalesReales()" style="padding: 0.35rem;"></td>
    <td><input type="number" step="0.01" min="0" class="real-plat-largo" value="${largo}" oninput="recalcularTotalesReales()" style="padding: 0.35rem;"></td>
    <td class="real-plat-sup" style="font-weight: 700; color: #4ade80;">0.00 m²</td>
    <td><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove(); recalcularTotalesReales();">✖</button></td>
  `;
  tbody.appendChild(tr);
  recalcularTotalesReales();
};

window.recalcularTotalesReales = () => {
  let totalM3 = 0;
  document.querySelectorAll('#bodyRealAndamio tr').forEach(tr => {
    const an = parseFloat(tr.querySelector('.real-and-ancho')?.value || 0);
    const la = parseFloat(tr.querySelector('.real-and-largo')?.value || 0);
    const al = parseFloat(tr.querySelector('.real-and-alto')?.value || 0);
    const vol = parseFloat((an * la * al).toFixed(2));
    tr.querySelector('.real-and-vol').textContent = `${vol} m³`;
    totalM3 += vol;
  });
  const elM3 = document.getElementById('totalRealAndamioM3');
  if (elM3) elM3.textContent = `Total Andamio: ${totalM3.toFixed(2)} m³`;

  let totalM2 = 0;
  document.querySelectorAll('#bodyRealPlataforma tr').forEach(tr => {
    const np = parseInt(tr.querySelector('.real-plat-n')?.value || 0);
    const pa = parseFloat(tr.querySelector('.real-plat-ancho')?.value || 0);
    const pl = parseFloat(tr.querySelector('.real-plat-largo')?.value || 0);
    const sup = parseFloat((np * pa * pl).toFixed(2));
    tr.querySelector('.real-plat-sup').textContent = `${sup} m²`;
    totalM2 += sup;
  });
  const elM2 = document.getElementById('totalRealPlatM2');
  if (elM2) elM2.textContent = `Total Plataformas: ${totalM2.toFixed(2)} m²`;
};

window.guardarHabilitacionAndamio = async (e) => {
  e.preventDefault();
  const solId = document.getElementById('habSolId').value;

  // Validación estricta de fotografía del andamio montado
  const fotoMontado = document.getElementById('habFotoBase64')?.value;
  if (!fotoMontado) {
    alert('⚠️ REQUISITO OBLIGATORIO DE SEGURIDAD ARAUCO:\n\nDebe tomar una fotografía o subir un archivo que registre el andamio montado antes de emitir la habilitación oficial.');
    document.getElementById('inputFotoMontaje')?.click();
    return;
  }

  const dimensionesRealesAndamio = [];
  document.querySelectorAll('#bodyRealAndamio tr').forEach(tr => {
    dimensionesRealesAndamio.push({
      ancho: parseFloat(tr.querySelector('.real-and-ancho')?.value || 0),
      largo: parseFloat(tr.querySelector('.real-and-largo')?.value || 0),
      alto: parseFloat(tr.querySelector('.real-and-alto')?.value || 0)
    });
  });

  const dimensionesRealesPlataforma = [];
  document.querySelectorAll('#bodyRealPlataforma tr').forEach(tr => {
    dimensionesRealesPlataforma.push({
      nPlat: parseInt(tr.querySelector('.real-plat-n')?.value || 0),
      ancho: parseFloat(tr.querySelector('.real-plat-ancho')?.value || 0),
      largo: parseFloat(tr.querySelector('.real-plat-largo')?.value || 0)
    });
  });

  const checklist11Puntos = {};
  for (let i = 0; i < CHECKLIST_11_PUNTOS.length; i++) {
    const radio = document.querySelector(`input[name="chk_${i}"]:checked`);
    checklist11Puntos[`punto_${i + 1}`] = radio ? radio.value : 'SI';
  }

  const payload = {
    dimensionesRealesAndamio,
    dimensionesRealesPlataforma,
    regimenHorarioReal: document.getElementById('habRegimenReal').value,
    itemEspecialCaldera: document.getElementById('habItemEspecial').value,
    nTarjetaFisica: document.getElementById('habNTarjeta').value,
    checklist11Puntos,
    fotoAndamioMontado: fotoMontado,
    fotoCartelHabilitacion: '',
    firmaSupervisorAndamista: `${AppState.currentUser.nombre} (Supervisor)`
  };

  try {
    const res = await fetch(`/api/ejecutante/habilitar-andamio/${solId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.ok) {
      alert(`✅ Andamio ${res.solicitud.numeroCorrelativo} HABILITADO oficialmente.\nMetraje Real: ${res.solicitud.totalVolumenRealM3} m³ | ${res.solicitud.totalSuperficieRealM2} m².\nFotografía de montaje registrada exitosamente.`);
      cerrarModalHabilitacion();
      imprimirTarjetaHabilitacion(res.solicitud);
      renderPortalPorRol();
    } else {
      alert('Error: ' + res.error);
    }
  } catch (err) {
    alert('Fallo de conexión al habilitar andamio');
  }
};

function renderOrdenesDesarmeEjecutante(container) {
  const list = AppState.ordenesEjecutante.filter(s => s.estado === 'DESARME_SOLICITADO');

  container.innerHTML = `
    <div class="info-card">
      <div style="border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <h3>🔧 Órdenes de Desarme Guiadas con Fotografía</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem;">
          Ubica la estructura montada con la foto de referencia, desmonta de forma segura y sube la foto del sector limpio e informa novedades de materiales.
        </p>
      </div>

      ${list.length === 0 ? `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No tienes órdenes de desarme pendientes en este momento.
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${list.map(s => `
            <div style="background-color: var(--bg-card); border: 2px solid var(--warning); border-radius: 8px; padding: 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
                <div>
                  <span class="status-badge desarme_solicitado">LISTO PARA DESARME</span>
                  <span style="font-weight: 800; font-size: 1.1rem; margin-left: 0.5rem;">${s.numeroCorrelativo}</span>
                  <span style="color: var(--arauco-accent); font-size: 0.9rem;">(${s.tarjetaId})</span>
                </div>
                <div>
                  <small style="color: var(--text-muted);">Solicitud Desarme: ${s.fechaSolicitudDesarme ? s.fechaSolicitudDesarme.split('T')[0] : 'Hoy'}</small>
                </div>
              </div>

              <div class="grid-3" style="font-size: 0.85rem; margin-bottom: 1rem;">
                <div>
                  <span style="color: var(--text-muted);">Ubicación Técnica:</span><br>
                  <strong style="font-size: 0.95rem;">${s.ubicacionTecnica}</strong><br>
                  <small style="color: var(--text-muted);">${s.sector}</small>
                </div>
                <div>
                  <span style="color: var(--text-muted);">Dimensiones Reales Montadas:</span><br>
                  <strong style="color: #38bdf8;">${s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0} m³</strong> · 
                  <strong style="color: #4ade80;">${s.totalSuperficieRealM2 || s.dimSolicitadaPlataforma?.superficieM2 || 0} m²</strong>
                </div>
                <div>
                  <span style="color: var(--text-muted);">Indicaciones de Desarme:</span><br>
                  <strong>${s.indicacionesDesarme || 'Desmontar y retirar todo el material del sector'}</strong>
                </div>
              </div>

              <div style="display: flex; gap: 1rem; align-items: center; background-color: var(--bg-dark); padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem;">
                <div style="text-align: center;">
                  <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Foto Andamio Montado (Referencia)</span>
                  ${s.fotoAndamioMontado ? `
                    <img src="${s.fotoAndamioMontado}" alt="Foto Andamio" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px; border: 1px solid var(--arauco-accent); cursor: pointer;" onclick="window.open('${s.fotoAndamioMontado}', '_blank')">
                  ` : '<span style="color: var(--text-muted);">Sin foto</span>'}
                </div>
                <div style="flex: 1; font-size: 0.85rem;">
                  <p>
                    📌 <strong>Guía para la Cuadrilla:</strong> Utiliza la fotografía de referencia para ubicar con exactitud el andamio dentro de la nave industrial y verificar su tarjeta física antes de iniciar el desmontaje.
                  </p>
                </div>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                <button class="btn" style="background-color: var(--arauco-accent); color: #000;" onclick="abrirModalCierreDesarme('${s.id}')">
                  🏁 Finalizar Desarme & Reportar Materiales
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <div id="modalCierreDesarme" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center; padding: 1rem;">
      <div class="auth-wrapper" style="max-width: 500px; margin: 0; width: 100%;">
        <h3>🏁 Cierre y Notificación de Desarme</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
          Sube la evidencia del sector limpio y declara el estado de los componentes desmontados.
        </p>

        <form id="formCierreDesarme" onsubmit="guardarCierreDesarme(event)">
          <input type="hidden" id="cierreSolId">

          <div class="form-group">
            <label>Estado del Material Desmontado</label>
            <select id="cierreEstadoMaterial" onchange="toggleDetalleMaterial(this.value)">
              <option value="NORMAL">✅ Normal: Sin componentes dañados ni faltantes</option>
              <option value="NOVEDADES">⚠️ Con Novedad: Componentes dañados, doblados o faltantes</option>
            </select>
          </div>

          <div class="form-group" id="grpDetalleMaterial" style="display: none;">
            <label>Detalle de Materiales Afectados</label>
            <textarea id="cierreDetalleMaterial" rows="2" placeholder="Ej. 2 tablones golpeados / 1 diagonal extraviada en el sector"></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
            <button type="button" class="btn btn-outline" onclick="document.getElementById('modalCierreDesarme').style.display='none'">Cancelar</button>
            <button type="submit" class="btn">🚀 Confirmar Desarme Finalizado</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

window.toggleDetalleMaterial = (val) => {
  const grp = document.getElementById('grpDetalleMaterial');
  if (grp) grp.style.display = val === 'NOVEDADES' ? 'block' : 'none';
};

window.abrirModalCierreDesarme = (solicitudId) => {
  document.getElementById('cierreSolId').value = solicitudId;
  document.getElementById('modalCierreDesarme').style.display = 'flex';
};

window.guardarCierreDesarme = async (e) => {
  e.preventDefault();
  const id = document.getElementById('cierreSolId').value;
  const estadoMaterial = document.getElementById('cierreEstadoMaterial').value;
  const detalleMaterial = document.getElementById('cierreDetalleMaterial').value;

  try {
    const res = await fetch(`/api/ejecutante/finalizar-desarme/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estadoMaterial,
        detalleMaterial,
        fotoAndamioDesmontado: '/solicitud_modelo_arauco.jpg'
      })
    }).then(r => r.json());

    if (res.ok) {
      alert(`✅ Desarme del andamio ${res.solicitud.numeroCorrelativo} finalizado exitosamente.`);
      document.getElementById('modalCierreDesarme').style.display = 'none';
      renderPortalPorRol();
    } else {
      alert('Error: ' + res.error);
    }
  } catch (err) {
    alert('Fallo de conexión al finalizar desarme');
  }
};

function renderMiProduccionEjecutante(container) {
  const list = AppState.ordenesEjecutante;

  container.innerHTML = `
    <div class="info-card">
      <div style="border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <h3>📊 Resumen de Producción y Tarjetas Emitidas</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem;">
          Historial completo de andamios montados, tarjetas generadas y metraje acumulado listo para facturar.
        </p>
      </div>

      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>N° Solicitud / Tarjeta</th>
              <th>Sector / Ubicación</th>
              <th>Volumen Real</th>
              <th>Plataformas</th>
              <th>Régimen</th>
              <th>Estado</th>
              <th>Tarjeta de Habilitación</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(s => `
              <tr>
                <td>
                  <strong>${s.numeroCorrelativo}</strong><br>
                  <small style="color: var(--arauco-accent);">${s.tarjetaId}</small>
                </td>
                <td>
                  <strong>${s.ubicacionTecnica}</strong><br>
                  <small style="color: var(--text-muted);">${s.sector}</small>
                </td>
                <td style="color: #38bdf8; font-weight: 700;">
                  ${s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0} m³
                </td>
                <td style="color: #4ade80; font-weight: 700;">
                  ${s.totalSuperficieRealM2 || s.dimSolicitadaPlataforma?.superficieM2 || 0} m²
                </td>
                <td><small>${s.regimenHorarioReal || 'Hábiles'}</small></td>
                <td><span class="status-badge ${s.estado.toLowerCase()}">${s.estado}</span></td>
                <td>
                  ${['HABILITADO', 'EN_ALQUILER', 'DESARME_SOLICITADO', 'DESARMADO'].includes(s.estado) ? `
                    <button class="btn btn-outline btn-sm" onclick="imprimirTarjetaHabilitacionPorId('${s.id}')">
                      🏷️ Imprimir Tarjeta QR
                    </button>
                  ` : '<span style="color: var(--text-muted);">-</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

window.imprimirTarjetaHabilitacionPorId = (solicitudId) => {
  const sol = AppState.ordenesEjecutante.find(s => s.id === solicitudId) ||
    AppState.todasSolicitudesGestionador.find(s => s.id === solicitudId);
  if (sol) imprimirTarjetaHabilitacion(sol);
};

function imprimirTarjetaHabilitacion(sol) {
  const area = document.getElementById('impresionTarjetaArea');
  const vol = sol.totalVolumenRealM3 || sol.dimSolicitadaAndamio?.volumenM3 || 0;
  const sup = sol.totalSuperficieRealM2 || sol.dimSolicitadaPlataforma?.superficieM2 || 0;
  const verifyUrl = `${window.location.origin}/verificar.html?id=${encodeURIComponent(sol.numeroCorrelativo)}`;

  const esDeshabilitadoHSE = sol.estado === 'DESHABILITADO_HSE';
  const colorBorde = esDeshabilitadoHSE ? '#dc2626' : '#15803d';
  const headerBg = esDeshabilitadoHSE ? '#dc2626' : '#15803d';
  const tituloHeader = esDeshabilitadoHSE ? '⛔ TARJETA ROJA — ANDAMIO NO HABILITADO' : 'TARJETA DE HABILITACIÓN DE ANDAMIO';
  const estadoHeader = esDeshabilitadoHSE ? 'ESTADO: DESHABILITADO POR SEGURIDAD — PROHIBIDO SUBIR' : 'Estado: COMPLETO Y EN CONDICIONES SEGURAS';
  const colorTarjetaId = esDeshabilitadoHSE ? '#dc2626' : '#15803d';

  let qrSvg = '';
  if (typeof window.generateQRCodeSVG === 'function') {
    qrSvg = window.generateQRCodeSVG(verifyUrl, 150);
  } else {
    qrSvg = '<div style="font-size: 2.5rem; line-height: 1;">📱</div>';
  }

  area.style.display = 'block';
  area.innerHTML = `
    <div class="tarjeta-imprimible" style="border: 4px solid ${colorBorde};">
      <div class="tarjeta-header" style="background-color: ${headerBg};">
        <h2>ARAUCO PLANTA INDUSTRIAL</h2>
        <div style="font-weight: 800; font-size: 1rem; letter-spacing: 0.5px;">${tituloHeader}</div>
        <div style="font-size: 0.75rem; text-transform: uppercase;">${estadoHeader}</div>
      </div>

      ${esDeshabilitadoHSE ? `
        <div style="background: #fee2e2; border: 2px solid #ef4444; border-radius: 4px; padding: 0.4rem; margin: 0.4rem 0; color: #991b1b; text-align: center; font-size: 0.8rem; font-weight: 800;">
          ⚠️ PELIGRO: ANDAMIO CLAUSURADO POR HSE. FALTANTE DE COMPONENTES O ARMADO DEFICIENTE. PROHIBIDO SU USO HASTA SU RE-HABILITACIÓN.
        </div>
      ` : ''}

      <div style="text-align: center; margin-bottom: 0.5rem;">
        <span style="font-size: 1.6rem; font-weight: 900; color: ${colorTarjetaId}; letter-spacing: 1px;">
          ${sol.tarjetaId}
        </span><br>
        <span style="font-size: 0.9rem; font-weight: 700; color: #334155;">
          Solicitud Oficial N°: ${sol.numeroCorrelativo}
        </span>
      </div>

      <div class="tarjeta-qr-box" style="text-align: center; margin: 0.5rem 0; padding: 0.5rem; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px;">
        <div style="display: flex; justify-content: center; margin-bottom: 0.35rem;">
          ${qrSvg}
        </div>
        <div style="font-weight: 800; font-size: 0.8rem; color: #0f172a;">
          CÓDIGO QR DE TRAZABILIDAD OFICIAL
        </div>
        <div style="font-size: 0.72rem; color: #64748b;">
          Escanea para auditar fotos, checklist y estado de seguridad
        </div>
        <div style="font-size: 0.65rem; color: #0284c7; word-break: break-all; margin-top: 2px;">
          ${verifyUrl}
        </div>
      </div>

      <div class="tarjeta-data-row">
        <span>Ubicación Técnica:</span>
        <strong>${sol.ubicacionTecnica}</strong>
      </div>
      <div class="tarjeta-data-row">
        <span>Sector / Centro Costos:</span>
        <strong>${sol.sector} (${sol.centroCostos})</strong>
      </div>
      <div class="tarjeta-data-row">
        <span>Empresa de Montaje:</span>
        <strong>${sol.proveedorAsignado || 'Contratista Externa'}</strong>
      </div>
      ${esDeshabilitadoHSE && sol.eventoSeguridadHSE ? `
        <div class="tarjeta-data-row" style="color: #b91c1c;">
          <span>Motivo Bloqueo HSE:</span>
          <strong>${sol.eventoSeguridadHSE.motivoPrincipal || 'Condición Insegura'}</strong>
        </div>
      ` : ''}
      <div class="tarjeta-data-row">
        <span>Fecha de Habilitación / Estado:</span>
        <strong>${sol.fechaArmado ? sol.fechaArmado.split('T')[0] : new Date().toISOString().split('T')[0]}</strong>
      </div>
      <div class="tarjeta-data-row">
        <span>Vigencia (30 días corridos):</span>
        <strong style="color: #b45309;">${sol.fechaLimite30Dias ? sol.fechaLimite30Dias.split('T')[0] : '30 días'}</strong>
      </div>

      <div style="margin-top: 1rem; border-top: 2px solid #0f172a; padding-top: 0.75rem; display: flex; justify-content: space-between; font-size: 0.75rem; text-align: center;">
        <div style="width: 48%;">
          <div style="font-weight: 700;">${sol.firmaSupervisorAndamista || 'Supervisor Andamista'}</div>
          <div style="color: #64748b; border-top: 1px dotted #000; margin-top: 25px;">Firma Supervisor Andamista</div>
        </div>
        <div style="width: 48%;">
          <div style="font-weight: 700;">${esDeshabilitadoHSE ? (sol.eventoSeguridadHSE?.inspectorNombre || 'Seguridad HSE') : (AppState.currentUser?.nombre || 'Ing. Marcelo Rossi')}</div>
          <div style="color: #64748b; border-top: 1px dotted #000; margin-top: 25px;">${esDeshabilitadoHSE ? 'Inspector HSE ARAUCO' : 'Firma Supervisor ARAUCO'}</div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    window.print();
    area.style.display = 'none';
  }, 300);
}

/* ========================================================
   VISUALIZACIÓN E IMPRESIÓN DE PLANILLA OFICIAL ARAUCO
   ======================================================== */
window.imprimirPlanillaOficialARAUCO = async (solicitudId) => {
  let sol = (AppState.todasSolicitudesGestionador || []).find(s => s.id === solicitudId) ||
    (AppState.misSolicitudes || []).find(s => s.id === solicitudId) ||
    (AppState.ordenesEjecutante || []).find(s => s.id === solicitudId);

  if (!sol) {
    try {
      const res = await fetch(`/api/solicitudes/${solicitudId}`).then(r => r.json());
      if (res.ok && res.solicitud) sol = res.solicitud;
    } catch (err) {
      console.error('Error al cargar solicitud:', err);
    }
  }

  if (!sol) {
    alert('No se pudo encontrar la información del pedido N° ' + solicitudId);
    return;
  }

  mostrarModalPlanillaOficial(sol);
};

function mostrarModalPlanillaOficial(sol) {
  let modal = document.getElementById('modalPlanillaOficial');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalPlanillaOficial';
    modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 2000; overflow-y: auto; padding: 1.5rem 1rem; display: flex; justify-content: center; align-items: flex-start;';
    document.body.appendChild(modal);
  }

  const verifyUrl = `${window.location.origin}/verificar.html?id=${encodeURIComponent(sol.numeroCorrelativo)}`;
  let qrSvg = '';
  if (typeof window.generateQRCodeSVG === 'function') {
    qrSvg = window.generateQRCodeSVG(verifyUrl, 95);
  } else {
    qrSvg = '<div style="font-size: 2.5rem;">📱</div>';
  }

  const volSol = sol.dimSolicitadaAndamio?.volumenM3 || 0;
  const supSol = sol.dimSolicitadaPlataforma?.superficieM2 || 0;
  const volReal = sol.totalVolumenRealM3 || volSol;
  const supReal = sol.totalSuperficieRealM2 || supSol;

  const checklistItems = [
    'Base y apoyos nivelados con durmientes/placas base reglamentarias',
    'Verticales aplomados y arriostramientos diagonales completos',
    'Plataformas metálicas completas sin huecos ni desplazamientos',
    'Baranda superior a 1.00m y baranda intermedia a 0.50m en todo el contorno',
    'Rodapiés colocados en todo el perímetro de trabajo (h >= 15cm)',
    'Escalera de acceso interior con trampa/escotilla segura y operativa',
    'Anclajes y amarres estructurales a puntos fijos y resistentes',
    'Distancia de seguridad a líneas eléctricas respetada',
    'Capacidad de carga máxima señalizada en estructura (Kg/m²)',
    'Orden, limpieza e inspección de elementos libres de fisuras/corrosión',
    'Tarjeta física de Habilitación colocada visiblemente en acceso'
  ];

  modal.innerHTML = `
    <div style="max-width: 900px; width: 100%; margin: 1rem auto; box-shadow: 0 10px 30px rgba(0,0,0,0.7); border-radius: 8px; overflow: hidden;">
      <!-- Barra de Acciones Superior (No se imprime) -->
      <div class="no-print" style="background: #0f172a; padding: 0.75rem 1.25rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--arauco-accent); flex-wrap: wrap; gap: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem; color: #fff;">
          <span style="font-size: 1.2rem;">📄</span>
          <strong style="font-size: 0.95rem;">Planilla Oficial ARAUCO · Solicitud N° ${sol.numeroCorrelativo}</strong>
          <span class="status-badge ${sol.estado.toLowerCase()}" style="font-size: 0.72rem;">${sol.estado}</span>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-sm" onclick="imprimirPlanillaDirecta('${sol.id}')" style="background: #15803d; color: #fff; font-weight: 700; padding: 0.4rem 0.8rem;">
            🖨️ Imprimir / Guardar en PDF
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="imprimirTarjetaHabilitacionPorId('${sol.id}')" title="Ver tarjeta QR de andamio">
            🏷️ Tarjeta QR
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.open('/verificar.html?id=' + encodeURIComponent('${sol.numeroCorrelativo}'), '_blank')" title="Ver ficha en terreno">
            🌐 Ficha Web
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="cerrarModalPlanillaOficial()" style="border-color: #ef4444; color: #ef4444; font-weight: 700;">
            ✖ Cerrar
          </button>
        </div>
      </div>

      <!-- Hoja Oficial ARAUCO Documento Imprimible -->
      <div style="background: #ffffff; padding: 1.5rem; overflow-x: auto;">
        <div class="planilla-arauco-print" id="planillaOficialDocumento" style="background: #ffffff; color: #000000; font-family: Arial, sans-serif; padding: 18px; border: 2px solid #000; font-size: 11px; max-width: 840px; margin: 0 auto;">
          
          <!-- Encabezado Corporativo Oficial -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="background: #1b4332; color: #fff; font-weight: 900; font-size: 1.5rem; padding: 4px 14px; letter-spacing: 2px; border-radius: 4px;">arauco</div>
              <div>
                <div style="font-size: 12px; font-weight: 800; color: #1b4332;">PLANTA INDUSTRIAL CELULOSA Y MADERAS</div>
                <div style="font-size: 9.5px; color: #334155; font-weight: 600;">SISTEMA INTEGRADO DE GESTIÓN Y PROVISIÓN DE ANDAMIOS</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 15px; font-weight: 900; color: #15803d; letter-spacing: 0.5px;">SOLICITUD OFICIAL N° ${sol.numeroCorrelativo}</div>
              <div style="font-size: 11px; font-weight: 800; color: #0f172a;">TARJETA: ${sol.tarjetaId || 'HAB-' + sol.numeroCorrelativo}</div>
              <div style="font-size: 10px; color: #475569; font-weight: 600;">ESTADO ACTUAL: <span style="font-weight: 800; text-transform: uppercase;">${sol.estado}</span></div>
            </div>
          </div>

          <!-- Título del Formulario -->
          <div style="background: #f1f5f9; border: 1.5px solid #000; text-align: center; padding: 6px; font-weight: 800; font-size: 12px; margin-bottom: 10px; letter-spacing: 0.5px;">
            SOLICITUD DE PROVISIÓN DE ANDAMIOS · REGISTRO OFICIAL DE MONTAJE Y HABILITACIÓN
          </div>

          <!-- 1. IDENTIFICACIÓN Y GENERALIDADES DEL REQUERIMIENTO -->
          <div style="background: #e2e8f0; border: 1px solid #000; padding: 4px 6px; font-weight: 800; font-size: 10.5px; margin-bottom: 4px;">
            1. IDENTIFICACIÓN Y GENERALIDADES DEL REQUERIMIENTO
          </div>
          <table class="planilla-table" style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px;">
            <tbody>
              <tr>
                <th style="width: 25%; background: #f8fafc; border: 1px solid #000; padding: 4px 6px; text-align: left;">SECTOR SOLICITANTE</th>
                <td style="width: 25%; border: 1px solid #000; padding: 4px 6px;">${sol.sectorSolicitante || 'Mantenimiento'}</td>
                <th style="width: 25%; background: #f8fafc; border: 1px solid #000; padding: 4px 6px; text-align: left;">OPORTUNIDAD DE TRABAJO</th>
                <td style="width: 25%; border: 1px solid #000; padding: 4px 6px; font-weight: bold;">${sol.oportunidadTrabajo || 'Marcha normal'}</td>
              </tr>
              <tr>
                <th style="background: #f8fafc; border: 1px solid #000; padding: 4px 6px; text-align: left;">SOLICITANTE</th>
                <td style="border: 1px solid #000; padding: 4px 6px; font-weight: bold;">${sol.solicitanteNombre}</td>
                <th style="background: #f8fafc; border: 1px solid #000; padding: 4px 6px; text-align: left;">LEGAJO / SECTOR</th>
                <td style="border: 1px solid #000; padding: 4px 6px;">${sol.legajo || 'N/A'} · ${sol.sector || 'Planta'}</td>
              </tr>
              <tr>
                <th style="background: #f8fafc; border: 1px solid #000; padding: 4px 6px; text-align: left;">CENTRO DE COSTOS</th>
                <td style="border: 1px solid #000; padding: 4px 6px;">${sol.centroCostos || 'N/A'}</td>
                <th style="background: #f8fafc; border: 1px solid #000; padding: 4px 6px; text-align: left;">FECHA EMISIÓN</th>
                <td style="border: 1px solid #000; padding: 4px 6px;">${sol.fechaCreacion ? sol.fechaCreacion.split('T')[0] : '2026-11-16'}</td>
              </tr>
              <tr>
                <th style="background: #f8fafc; border: 1px solid #000; padding: 4px 6px; text-align: left;">UBICACIÓN TÉCNICA EXACTA</th>
                <td colspan="3" style="border: 1px solid #000; padding: 4px 6px; font-weight: bold; color: #0f172a;">${sol.ubicacionTecnica}</td>
              </tr>
              <tr>
                <th style="background: #f8fafc; border: 1px solid #000; padding: 4px 6px; text-align: left;">MOTIVO DEL TRABAJO</th>
                <td colspan="3" style="border: 1px solid #000; padding: 4px 6px;">${sol.motivo}</td>
              </tr>
              <tr>
                <th style="background: #f8fafc; border: 1px solid #000; padding: 4px 6px; text-align: left;">TIPOS DE ANDAMIO</th>
                <td style="border: 1px solid #000; padding: 4px 6px;">${(sol.tiposAndamio || []).join(', ') || 'Andamio Multidireccional'}</td>
                <th style="background: #f8fafc; border: 1px solid #000; padding: 4px 6px; text-align: left;">ÍTEM CALDERA / RÉGIMEN</th>
                <td style="border: 1px solid #000; padding: 4px 6px;">${sol.itemEspecialCaldera || 'No aplica'} · ${sol.regimenHorarioEstimado || 'Hábiles'}</td>
              </tr>
            </tbody>
          </table>

          <!-- 2. DIMENSIONES SOLICITADAS (METRAJE ESTIMADO) -->
          <div style="background: #e2e8f0; border: 1px solid #000; padding: 4px 6px; font-weight: 800; font-size: 10.5px; margin-bottom: 4px;">
            2. DIMENSIONES Y METRAJE SOLICITADO
          </div>
          <table class="planilla-table" style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px;">
            <tbody>
              <tr>
                <td style="width: 50%; border: 1px solid #000; padding: 6px;">
                  <strong>Estructura Estimada:</strong> ${sol.dimSolicitadaAndamio?.ancho || 0}m (Ancho) × ${sol.dimSolicitadaAndamio?.largo || 0}m (Largo) × ${sol.dimSolicitadaAndamio?.alto || 0}m (Alto)<br>
                  <span style="font-size: 11px; font-weight: 800; color: #0284c7;">Volumen Solicitado: ${volSol} m³</span>
                </td>
                <td style="width: 50%; border: 1px solid #000; padding: 6px;">
                  <strong>Plataformas Estimadas:</strong> ${sol.dimSolicitadaPlataforma?.nPlat || 0} plat. × ${sol.dimSolicitadaPlataforma?.ancho || 0}m × ${sol.dimSolicitadaPlataforma?.largo || 0}m<br>
                  <span style="font-size: 11px; font-weight: 800; color: #16a34a;">Superficie Solicitada: ${supSol} m²</span>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="border: 1px solid #000; padding: 4px 6px; font-size: 9px; color: #334155;">
                  <strong>Observaciones Técnicas del Solicitante:</strong> ${sol.observaciones || 'Sin especificaciones extraordinarias.'}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 3. PROGRAMACIÓN Y ASIGNACIÓN (GESTIONADOR ARAUCO) -->
          <div style="background: #e2e8f0; border: 1px solid #000; padding: 4px 6px; font-weight: 800; font-size: 10.5px; margin-bottom: 4px;">
            3. PROGRAMACIÓN Y DESPACHO (GESTIÓN / ADMINISTRACIÓN ARAUCO)
          </div>
          <table class="planilla-table" style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px;">
            <tbody>
              <tr>
                <th style="width: 25%; background: #f8fafc; border: 1px solid #000; padding: 4px 6px; text-align: left;">EMPRESA ASIGNADA</th>
                <td style="width: 25%; border: 1px solid #000; padding: 4px 6px; font-weight: bold;">${sol.proveedorAsignado || 'Sin empresa'}</td>
                <th style="width: 25%; background: #f8fafc; border: 1px solid #000; padding: 4px 6px; text-align: left;">PRIORIDAD / MONTAJE</th>
                <td style="width: 25%; border: 1px solid #000; padding: 4px 6px;">${sol.prioridad || 'NORMAL'} · Prog: ${sol.fechaProgramada || 'Hoy'}</td>
              </tr>
              <tr>
                <th style="background: #f8fafc; border: 1px solid #000; padding: 4px 6px; text-align: left;">INDICACIONES TÉCNICAS</th>
                <td colspan="3" style="border: 1px solid #000; padding: 4px 6px; font-size: 9px;">
                  ${sol.indicacionesGestionador || 'Montaje reglamentario según estándar ARAUCO. Verificar área antes de iniciar.'}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 4. HABILITACIÓN EN TERRENO Y CHECKLIST 11 PUNTOS -->
          <div style="background: #e2e8f0; border: 1px solid #000; padding: 4px 6px; font-weight: 800; font-size: 10.5px; margin-bottom: 4px;">
            4. HABILITACIÓN EN TERRENO, DIMENSIONES REALES Y CHECKLIST DE SEGURIDAD (CONTRATISTA)
          </div>
          <table class="planilla-table" style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px;">
            <tbody>
              <tr>
                <td style="width: 68%; border: 1px solid #000; padding: 6px; vertical-align: top;">
                  <div style="margin-bottom: 4px;">
                    <strong>Empresa Ejecutora:</strong> ${sol.proveedorAsignado || 'Contratista Externa'} · 
                    <strong>Fecha Armado:</strong> ${sol.fechaArmado ? sol.fechaArmado.split('T')[0] : 'En proceso'} · 
                    <strong>Régimen:</strong> ${sol.regimenHorarioReal || sol.regimenHorarioEstimado || 'Hábiles'}
                  </div>
                  <div style="display: flex; gap: 15px; margin-bottom: 6px;">
                    <div style="font-weight: 800; color: #0284c7; font-size: 11px;">Volumen Real: ${volReal} m³</div>
                    <div style="font-weight: 800; color: #16a34a; font-size: 11px;">Superficie Real: ${supReal} m²</div>
                    <div style="font-weight: 800; color: #b45309; font-size: 11px;">Permanencia: ${sol.diasPermanencia || 1} / 30 días</div>
                  </div>
                  <div style="font-size: 9px; font-weight: 800; margin-bottom: 3px; color: #1b4332;">CHECKLIST REGLAMENTARIO DE 11 PUNTOS DE SEGURIDAD (ARAUCO):</div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px; font-size: 8.5px;">
                    ${checklistItems.map((item, idx) => `
                      <div><span style="color: #16a34a; font-weight: 900;">[✓]</span> ${idx + 1}. ${item}</div>
                    `).join('')}
                  </div>
                </td>
                <td style="width: 32%; border: 1px solid #000; padding: 6px; text-align: center; vertical-align: middle; background: #f8fafc;">
                  <div style="display: flex; justify-content: center; margin-bottom: 4px;">
                    ${qrSvg}
                  </div>
                  <div style="font-size: 10.5px; font-weight: 900; color: #15803d; line-height: 1.15;">
                    🟢 ANDAMIO HABILITADO<br>COMPLETO Y SEGURO
                  </div>
                  <div style="font-size: 8.5px; color: #475569; margin-top: 3px;">
                    Auditoría en terreno QR:<br><strong>${sol.numeroCorrelativo}</strong>
                  </div>
                  ${sol.fotoAndamioMontado ? `
                    <div style="margin-top: 6px; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
                      <div style="font-size: 8px; font-weight: bold; color: #334155; margin-bottom: 2px;">FOTO DEL MONTAJE:</div>
                      <img src="${sol.fotoAndamioMontado}" alt="Foto Andamio" style="max-height: 80px; max-width: 100%; border: 1px solid #334155; border-radius: 4px; object-fit: cover; cursor: pointer;" onclick="window.open('${sol.fotoAndamioMontado}', '_blank')">
                    </div>
                  ` : ''}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 5. AUDITORÍA TÉCNICA DE METRAJE -->
          <table class="planilla-table" style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px;">
            <tbody>
              <tr>
                <th style="width: 25%; background: #e2e8f0; border: 1px solid #000; padding: 4px 6px; text-align: left;">AUDITORÍA TÉCNICA ARAUCO</th>
                <td style="width: 25%; border: 1px solid #000; padding: 4px 6px; font-weight: bold; color: #0284c7;">
                  ${sol.estadoAuditoria || 'VALIDADO EN TERRENO'}
                </td>
                <th style="width: 25%; background: #e2e8f0; border: 1px solid #000; padding: 4px 6px; text-align: left;">METRAJE CERTIFICABLE</th>
                <td style="width: 25%; border: 1px solid #000; padding: 4px 6px; font-weight: bold;">
                  ${volReal} m³ (Andamio) / ${supReal} m² (Plat.)
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 6. FIRMAS DE RESPONSABILIDAD -->
          <div style="display: flex; justify-content: space-between; border-top: 2px solid #000; padding-top: 15px; margin-top: 10px; text-align: center; font-size: 9.5px;">
            <div style="width: 30%;">
              <div style="font-weight: bold; height: 18px;">${sol.solicitanteNombre}</div>
              <div style="border-top: 1px dotted #000; margin-top: 25px; padding-top: 2px;">
                <strong>Firma Solicitante ARAUCO</strong><br>
                <span style="color: #64748b;">Legajo: ${sol.legajo || 'N/A'}</span>
              </div>
            </div>
            <div style="width: 30%;">
              <div style="font-weight: bold; height: 18px;">${sol.firmaSupervisorAndamista || 'Supervisor Montajista'}</div>
              <div style="border-top: 1px dotted #000; margin-top: 25px; padding-top: 2px;">
                <strong>Firma Empresa Montajista</strong><br>
                <span style="color: #64748b;">${sol.proveedorAsignado || 'Contratista'}</span>
              </div>
            </div>
            <div style="width: 30%;">
              <div style="font-weight: bold; height: 18px;">Diego A. Cristaldo / Ing. Marcelo Rossi</div>
              <div style="border-top: 1px dotted #000; margin-top: 25px; padding-top: 2px;">
                <strong>Firma Gestión / Supervisión ARAUCO</strong><br>
                <span style="color: #64748b;">Administración de Andamios</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

window.cerrarModalPlanillaOficial = () => {
  const modal = document.getElementById('modalPlanillaOficial');
  if (modal) modal.style.display = 'none';
};

window.imprimirPlanillaDirecta = (solicitudId) => {
  const docHtml = document.getElementById('planillaOficialDocumento')?.outerHTML;
  if (!docHtml) return;

  let area = document.getElementById('impresionPlanillaArea');
  if (!area) {
    area = document.createElement('div');
    area.id = 'impresionPlanillaArea';
    document.body.appendChild(area);
  }

  area.innerHTML = docHtml;
  area.style.display = 'block';

  setTimeout(() => {
    window.print();
    area.style.display = 'none';
  }, 250);
};

/* ========================================================
   MÓDULO DE BÚSQUEDA RÁPIDA Y ESCÁNER QR DE ANDAMIOS ARAUCO
   ======================================================== */
let html5QrCodeScannerInstance = null;
let camarasDisponibles = [];
let camaraActualId = null;

function emitirBeepExito() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch (e) {}
}

function extraerCorrelativoDeQR(qrString) {
  if (!qrString) return '';
  qrString = qrString.trim();
  // Intento 1: Parámetro URL ?id=AND-2026-0001
  const matchUrl = qrString.match(/[?&]id=([^&#]+)/i);
  if (matchUrl && matchUrl[1]) {
    return decodeURIComponent(matchUrl[1]);
  }
  // Intento 2: Patrón ARAUCO AND-YYYY-XXXX
  const matchAnd = qrString.match(/(AND[-\s_]?\d{4}[-\s_]?\d+)/i);
  if (matchAnd && matchAnd[1]) {
    return matchAnd[1].toUpperCase().replace(/\s/g, '-');
  }
  // Intento 3: Sufijo de ruta /verificar/ID o /solicitudes/ID
  const matchPath = qrString.match(/\/(AND[^\/\s?#]+)$/i);
  if (matchPath && matchPath[1]) {
    return matchPath[1];
  }
  return qrString;
}

window.abrirBuscadorEscaneoQR = function(tabInicial = 'camara') {
  let modal = document.getElementById('modalBuscadorQR');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalBuscadorQR';
    modal.style.cssText = 'display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 2500; align-items: center; justify-content: center; padding: 1rem; overflow-y: auto;';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="qr-scanner-card">
      <!-- Encabezado del Modal -->
      <div style="padding: 1rem 1.25rem; background: var(--bg-card); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span style="font-size: 1.3rem;">📷</span>
          <div>
            <h3 style="margin: 0; font-size: 1.05rem; color: #fff;">Buscador & Escáner de Andamios ARAUCO</h3>
            <p style="margin: 0.15rem 0 0 0; font-size: 0.75rem; color: var(--text-muted);">
              Escanee la tarjeta QR en terreno o busque por N° correlativo, tag de equipo o contratista.
            </p>
          </div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="cerrarModalBuscadorQR()" style="padding: 0.25rem 0.6rem; font-size: 1rem; line-height: 1;">✕</button>
      </div>

      <!-- Selector de Pestañas / Modos -->
      <div class="qr-tabs-nav" id="qrTabsNav">
        <button class="qr-tab-btn" id="btnTabCamaraQR" onclick="cambiarTabBuscadorQR('camara')">
          <span>📷</span> Cámara en Vivo
        </button>
        <button class="qr-tab-btn" id="btnTabTextoQR" onclick="cambiarTabBuscadorQR('texto')">
          <span>🔍</span> Buscar por Texto
        </button>
        <button class="qr-tab-btn" id="btnTabArchivoQR" onclick="cambiarTabBuscadorQR('archivo')">
          <span>📁</span> Subir Foto QR
        </button>
      </div>

      <!-- Contenedor Principal de Vistas -->
      <div style="padding: 1rem; overflow-y: auto; max-height: calc(90vh - 120px);">
        
        <!-- Pestaña 1: Cámara en Vivo -->
        <div id="qrPanelCamara" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
            <span style="font-size: 0.8rem; color: #94a3b8;">
              Apunte la cámara a la <strong>Tarjeta Física de Habilitación</strong> del andamio.
            </span>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <select id="selectCamarasQR" style="display: none; padding: 0.2rem 0.4rem; font-size: 0.75rem; background: var(--bg-input); color: #fff; border: 1px solid var(--border); border-radius: 4px;" onchange="cambiarCamaraQR(this.value)">
              </select>
              <button class="btn btn-outline btn-sm" id="btnIniciarCamaraQR" onclick="iniciarEscanerCamaraQR()" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">
                ▶️ Activar Cámara
              </button>
              <button class="btn btn-outline btn-sm" id="btnDetenerCamaraQR" onclick="detenerEscanerCamaraQR()" style="display: none; padding: 0.25rem 0.6rem; font-size: 0.75rem; color: #ef4444; border-color: #ef4444;">
                ⏹️ Detener
              </button>
            </div>
          </div>

          <div class="qr-viewfinder-wrapper" id="qrViewfinderWrapper">
            <div id="qrReaderView" style="width: 100%; min-height: 280px;"></div>
            <div class="qr-scan-reticle" id="qrScanReticle">
              <div class="qr-laser-line"></div>
            </div>
          </div>

          <div id="qrScanningIndicator" style="display: none; text-align: center; margin-top: 0.6rem; font-size: 0.8rem; color: #38bdf8;">
            <span class="spinner" style="display: inline-block; width: 14px; height: 14px; margin-right: 0.4rem; vertical-align: middle;"></span>
            Escaneando código QR en tiempo real...
          </div>

          <div id="qrErrorCamara"></div>
        </div>

        <!-- Pestaña 2: Búsqueda Rápida por Texto -->
        <div id="qrPanelTexto" style="display: none;">
          <div style="margin-bottom: 0.8rem;">
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
              <input type="text" id="inputBuscarAndamioTexto" placeholder="🔍 Escriba N° Correlativo (AND-...), Solicitante, Tag o Área..." style="flex: 1; padding: 0.5rem 0.8rem; font-size: 0.9rem;" oninput="buscarAndamiosEnVivo(this.value)">
              <button class="btn btn-outline btn-sm" onclick="document.getElementById('inputBuscarAndamioTexto').value=''; buscarAndamiosEnVivo('');" style="padding: 0.5rem 0.75rem;">Limpiar</button>
            </div>
            
            <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">Filtrar por:</span>
              <select id="filtroRapidoEstadoQR" style="padding: 0.25rem 0.5rem; font-size: 0.78rem; background: var(--bg-input); color: #fff; border: 1px solid var(--border); border-radius: 4px;" onchange="buscarAndamiosEnVivo(document.getElementById('inputBuscarAndamioTexto').value)">
                <option value="TODOS">Todos los Estados</option>
                <option value="HABILITADOS">🟢 Habilitados Seguros</option>
                <option value="DESHABILITADOS">🔴 Deshabilitados HSE</option>
                <option value="ALQUILER">🟡 En Alquiler (>30d)</option>
                <option value="DESARME">🟠 En Desarme</option>
              </select>
            </div>
          </div>

          <div id="listaResultadosBusqueda" style="max-height: 380px; overflow-y: auto;">
            <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem;">
              Cargando catálogo de andamios...
            </div>
          </div>
        </div>

        <!-- Pestaña 3: Subir Foto de Tarjeta -->
        <div id="qrPanelArchivo" style="display: none; text-align: center; padding: 2rem 1rem;">
          <div style="font-size: 3rem; margin-bottom: 0.5rem;">📷</div>
          <h4 style="margin: 0 0 0.5rem 0; color: #fff;">Escanear desde Foto o Archivo</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 420px; margin: 0 auto 1.5rem auto;">
            Si la cámara en vivo no está disponible o tiene una foto ya tomada de la tarjeta física, puede cargarla aquí para decodificar su QR al instante.
          </p>
          <input type="file" id="inputFileFotoQR" accept="image/*" capture="environment" style="display: none;" onchange="procesarFotoArchivoQR(this)">
          <button class="btn btn-warning" onclick="document.getElementById('inputFileFotoQR').click()" style="padding: 0.6rem 1.5rem; font-size: 0.95rem; font-weight: 700; background: #e0a96d; color: #1a202c;">
            📸 Tomar Foto o Elegir Imagen
          </button>
          <div id="qrReaderViewHidden" style="display: none;"></div>
        </div>

        <!-- Ficha Técnica & de Seguridad del Andamio (Resultado) -->
        <div id="qrPanelFichaResultado" style="display: none;">
          <!-- Se inyecta dinámicamente -->
        </div>

      </div>
    </div>
  `;

  modal.style.display = 'flex';
  cambiarTabBuscadorQR(tabInicial);
};

window.cerrarModalBuscadorQR = function() {
  detenerEscanerCamaraQR();
  const modal = document.getElementById('modalBuscadorQR');
  if (modal) modal.style.display = 'none';
};

window.cambiarTabBuscadorQR = function(modo) {
  const tabs = ['camara', 'texto', 'archivo'];
  tabs.forEach(t => {
    const btn = document.getElementById(`btnTab${t.charAt(0).toUpperCase() + t.slice(1)}QR`);
    const panel = document.getElementById(`qrPanel${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn) btn.classList.remove('active');
    if (panel) panel.style.display = 'none';
  });

  const ficha = document.getElementById('qrPanelFichaResultado');
  if (ficha) ficha.style.display = 'none';

  const nav = document.getElementById('qrTabsNav');
  if (nav) nav.style.display = 'flex';

  if (modo === 'camara') {
    document.getElementById('btnTabCamaraQR')?.classList.add('active');
    const p = document.getElementById('qrPanelCamara');
    if (p) p.style.display = 'block';
    setTimeout(iniciarEscanerCamaraQR, 100);
  } else if (modo === 'texto') {
    detenerEscanerCamaraQR();
    document.getElementById('btnTabTextoQR')?.classList.add('active');
    const p = document.getElementById('qrPanelTexto');
    if (p) p.style.display = 'block';
    const input = document.getElementById('inputBuscarAndamioTexto');
    if (input) {
      input.focus();
      buscarAndamiosEnVivo(input.value);
    }
  } else if (modo === 'archivo') {
    detenerEscanerCamaraQR();
    document.getElementById('btnTabArchivoQR')?.classList.add('active');
    const p = document.getElementById('qrPanelArchivo');
    if (p) p.style.display = 'block';
  }
};

window.iniciarEscanerCamaraQR = async function() {
  const container = document.getElementById('qrReaderView');
  if (!container) return;

  if (typeof Html5Qrcode === 'undefined') {
    document.getElementById('qrErrorCamara').innerHTML = `
      <div style="background: rgba(239,68,68,0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 0.6rem; border-radius: 6px; font-size: 0.8rem; margin-top: 0.5rem; text-align: center;">
        ⚠️ La librería del escáner no pudo iniciarse en este navegador. Utilice la pestaña <strong>Buscar por Texto</strong>.
      </div>
    `;
    return;
  }

  try {
    if (html5QrCodeScannerInstance) {
      try {
        await html5QrCodeScannerInstance.stop();
      } catch (e) {}
      html5QrCodeScannerInstance = null;
    }

    html5QrCodeScannerInstance = new Html5Qrcode("qrReaderView");

    // Enumerar cámaras disponibles
    try {
      const devices = await Html5Qrcode.getCameras();
      camarasDisponibles = devices || [];
      const camSelect = document.getElementById('selectCamarasQR');
      if (camSelect && camarasDisponibles.length > 1) {
        camSelect.innerHTML = camarasDisponibles.map(d => `<option value="${d.id}" ${d.id === camaraActualId ? 'selected' : ''}>📷 ${d.label || 'Cámara ' + d.id.slice(0, 6)}</option>`).join('');
        camSelect.style.display = 'inline-block';
      }
    } catch (e) {}

    const config = {
      fps: 15,
      qrbox: (w, h) => {
        const edge = Math.floor(Math.min(w, h) * 0.72);
        return { width: edge, height: edge };
      },
      aspectRatio: 1.0
    };

    const qrSuccessCallback = async (decodedText) => {
      emitirBeepExito();
      try {
        await html5QrCodeScannerInstance.stop();
      } catch (e) {}
      html5QrCodeScannerInstance = null;

      const codigo = extraerCorrelativoDeQR(decodedText);
      await cargarFichaAndamioModal(codigo);
    };

    const camConfig = camaraActualId ? { deviceId: { exact: camaraActualId } } : { facingMode: "environment" };

    await html5QrCodeScannerInstance.start(
      camConfig,
      config,
      qrSuccessCallback,
      () => {} // Ignorar frames sin código
    );

    document.getElementById('qrScanningIndicator').style.display = 'block';
    document.getElementById('btnIniciarCamaraQR').style.display = 'none';
    document.getElementById('btnDetenerCamaraQR').style.display = 'inline-block';
    document.getElementById('qrErrorCamara').innerHTML = '';
  } catch (err) {
    console.warn('Cámara QR no pudo iniciarse:', err);
    document.getElementById('qrScanningIndicator').style.display = 'none';
    document.getElementById('btnIniciarCamaraQR').style.display = 'inline-block';
    document.getElementById('btnDetenerCamaraQR').style.display = 'none';
    document.getElementById('qrErrorCamara').innerHTML = `
      <div style="background: rgba(239,68,68,0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 0.6rem; border-radius: 6px; font-size: 0.8rem; margin-top: 0.5rem; text-align: center;">
        ⚠️ No se pudo acceder a la cámara en vivo (${err?.name || 'Permiso denegado o no disponible'}).<br>
        Puede <strong>subir una foto de la tarjeta</strong> o usar el <strong>buscador por texto</strong>.
      </div>
    `;
  }
};

window.cambiarCamaraQR = async function(deviceId) {
  camaraActualId = deviceId;
  await iniciarEscanerCamaraQR();
};

window.detenerEscanerCamaraQR = async function() {
  if (html5QrCodeScannerInstance) {
    try {
      await html5QrCodeScannerInstance.stop();
    } catch (e) {}
    html5QrCodeScannerInstance = null;
  }
  const ind = document.getElementById('qrScanningIndicator');
  if (ind) ind.style.display = 'none';
  const btnStart = document.getElementById('btnIniciarCamaraQR');
  if (btnStart) btnStart.style.display = 'inline-block';
  const btnStop = document.getElementById('btnDetenerCamaraQR');
  if (btnStop) btnStop.style.display = 'none';
};

window.procesarFotoArchivoQR = async function(input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];

  const html5QrCode = new Html5Qrcode("qrReaderViewHidden");
  const panel = document.getElementById('qrPanelArchivo');
  if (panel) {
    panel.innerHTML += `
      <div id="archivoProcesandoMsg" style="margin-top: 1rem; color: #38bdf8; font-size: 0.85rem;">
        <span class="spinner" style="display: inline-block; width: 14px; height: 14px; vertical-align: middle; margin-right: 0.3rem;"></span>
        Analizando fotografía en busca de código QR...
      </div>
    `;
  }

  try {
    const decodedText = await html5QrCode.scanFile(file, true);
    emitirBeepExito();
    const codigo = extraerCorrelativoDeQR(decodedText);
    await cargarFichaAndamioModal(codigo);
  } catch (err) {
    alert('No se detectó un código QR legible en la imagen seleccionada. Verifique el enfoque, la iluminación o busque el andamio por número correlativo o tag.');
    document.getElementById('archivoProcesandoMsg')?.remove();
  } finally {
    input.value = '';
  }
};

window.buscarAndamiosEnVivo = async function(query) {
  query = (query || '').toLowerCase().trim();
  const filtroEstado = document.getElementById('filtroRapidoEstadoQR')?.value || 'TODOS';
  const contenedor = document.getElementById('listaResultadosBusqueda');
  if (!contenedor) return;

  // Obtener lista completa si no está en memoria
  let todas = AppState.todasSolicitudesGestionador;
  if (!todas || todas.length === 0) {
    try {
      const res = await fetch('/api/solicitudes').then(r => r.json());
      todas = res.solicitudes || [];
      AppState.todasSolicitudesGestionador = todas;
    } catch (e) {
      todas = AppState.solicitudes || [];
    }
  }

  const filtradas = todas.filter(s => {
    if (filtroEstado === 'HABILITADOS' && !['HABILITADO'].includes(s.estado)) return false;
    if (filtroEstado === 'DESHABILITADOS' && s.estado !== 'DESHABILITADO_HSE') return false;
    if (filtroEstado === 'ALQUILER' && s.estado !== 'EN_ALQUILER') return false;
    if (filtroEstado === 'DESARME' && !['DESARME_SOLICITADO', 'DESARMADO'].includes(s.estado)) return false;

    if (!query) return true;

    const corr = (s.numeroCorrelativo || '').toLowerCase();
    const tarj = (s.tarjetaId || '').toLowerCase();
    const sec = (s.sector || '').toLowerCase();
    const ubi = (s.ubicacionTecnica || '').toLowerCase();
    const prov = (s.proveedorAsignado || '').toLowerCase();
    const solNom = (s.solicitanteNombre || '').toLowerCase();
    const mot = (s.motivo || '').toLowerCase();
    const tipo = (s.tipoAndamio || '').toLowerCase();

    return corr.includes(query) || tarj.includes(query) || sec.includes(query) ||
           ubi.includes(query) || prov.includes(query) || solNom.includes(query) ||
           mot.includes(query) || tipo.includes(query);
  });

  if (filtradas.length === 0) {
    contenedor.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem;">
        No se encontraron andamios que coincidan con la búsqueda.
      </div>
    `;
    return;
  }

  contenedor.innerHTML = filtradas.map(s => {
    const esDeshabilitadoHSE = s.estado === 'DESHABILITADO_HSE';
    const esHabilitado = s.estado === 'HABILITADO';
    const esAlquiler = s.estado === 'EN_ALQUILER';
    const badgeColor = esDeshabilitadoHSE ? '#dc2626' : esHabilitado ? '#10b981' : esAlquiler ? '#f59e0b' : '#64748b';
    const badgeText = esDeshabilitadoHSE ? '⛔ DESHABILITADO HSE' : esHabilitado ? '🟢 HABILITADO' : esAlquiler ? '🟡 EN ALQUILER' : s.estado;
    const vol = s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0;

    return `
      <div class="search-result-card" onclick="cargarFichaAndamioModal('${s.numeroCorrelativo || s.id}')">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <strong style="color: #fff; font-size: 0.95rem;">${s.numeroCorrelativo || s.id}</strong>
            <span style="background: ${badgeColor}; color: #fff; font-size: 0.68rem; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 800;">
              ${badgeText}
            </span>
          </div>
          <div style="font-size: 0.8rem; color: #cbd5e1;">
            📍 ${s.ubicacionTecnica || s.sector || 'Planta General'}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">
            🏗️ ${s.proveedorAsignado || 'Sin Asignar'} · 👤 ${s.solicitanteNombre || 'ARAUCO'} · 📦 ${vol} m³
          </div>
        </div>
        <button class="btn btn-outline btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; white-space: nowrap;">
          Ver Ficha ➔
        </button>
      </div>
    `;
  }).join('');
};

window.cargarFichaAndamioModal = async function(codigo) {
  detenerEscanerCamaraQR();
  const modalFicha = document.getElementById('qrPanelFichaResultado');
  const tabsNav = document.getElementById('qrTabsNav');
  if (!modalFicha) return;

  // Ocultar pestañas mientras se ve la ficha
  ['qrPanelCamara', 'qrPanelTexto', 'qrPanelArchivo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  if (tabsNav) tabsNav.style.display = 'none';

  modalFicha.style.display = 'block';
  modalFicha.innerHTML = `
    <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
      <div class="spinner" style="margin: 0 auto 0.75rem; width: 28px; height: 28px;"></div>
      Consultando registro del andamio ${codigo}...
    </div>
  `;

  try {
    const res = await fetch('/api/solicitudes/verificar/' + encodeURIComponent(codigo)).then(r => r.json());
    if (!res.ok || !res.solicitud) {
      modalFicha.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">❌</div>
          <h3 style="color: #ef4444; margin: 0 0 0.5rem 0;">Andamio No Encontrado</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem;">
            No se encontró ningún registro para el código: <strong>${codigo}</strong>.<br>
            Verifique el número correlativo o asegúrese de que el andamio esté cargado en el sistema.
          </p>
          <button class="btn btn-outline" onclick="volverAModosBuscadorQR()">⬅️ Volver a Buscar / Escanear</button>
        </div>
      `;
      return;
    }

    renderFichaAndamioEnModal(res.solicitud);
  } catch (err) {
    modalFicha.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <h3 style="color: #ef4444;">⚠️ Error de Conexión</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem;">No se pudo comunicar con el servidor central de ARAUCO.</p>
        <button class="btn btn-outline" onclick="volverAModosBuscadorQR()">⬅️ Volver</button>
      </div>
    `;
  }
};

window.volverAModosBuscadorQR = function() {
  const modalFicha = document.getElementById('qrPanelFichaResultado');
  if (modalFicha) modalFicha.style.display = 'none';
  cambiarTabBuscadorQR('texto');
};

function renderFichaAndamioEnModal(sol) {
  const modalFicha = document.getElementById('qrPanelFichaResultado');
  if (!modalFicha) return;

  const esHSE = AppState.usuario?.rol === 'GESTIONADOR' || (AppState.usuario?.email || '').toLowerCase().includes('hse');
  const esContratista = AppState.usuario?.rol === 'EJECUTANTE';
  const esDeshabilitadoHSE = sol.estado === 'DESHABILITADO_HSE';
  const esHabilitado = sol.estado === 'HABILITADO';
  const esAlquiler = sol.estado === 'EN_ALQUILER';
  const vol = sol.totalVolumenRealM3 || sol.dimSolicitadaAndamio?.volumenM3 || 0;
  const sup = sol.totalSuperficieRealM2 || sol.dimSolicitadaPlataforma?.superficieM2 || 0;

  const evHSE = sol.eventoSeguridadHSE;

  modalFicha.innerHTML = `
    <div>
      <!-- Barra superior de navegación de la ficha -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <button class="btn btn-outline btn-sm" onclick="volverAModosBuscadorQR()" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">
          ⬅️ Volver a Buscar / Escanear
        </button>
        <span style="font-size: 0.8rem; color: var(--text-muted);">
          Tarjeta: <strong style="color: var(--arauco-accent);">${sol.tarjetaId || 'S/N'}</strong>
        </span>
      </div>

      <!-- Banner de Estado de Seguridad Operativa -->
      ${esDeshabilitadoHSE ? `
        <div style="background: #dc2626; color: #fff; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);">
          <div style="display: flex; align-items: center; gap: 0.6rem; font-size: 1.1rem; font-weight: 800; margin-bottom: 0.3rem;">
            <span>⛔</span> TARJETA ROJA — ANDAMIO DESHABILITADO POR SEGURIDAD (HSE)
          </div>
          <div style="font-size: 0.85rem; font-weight: 700; margin-bottom: 0.4rem; color: #fee2e2;">
            PROHIBIDO SUBIR O TRABAJAR SOBRE ESTA ESTRUCTURA
          </div>
          ${evHSE ? `
            <div style="background: rgba(0,0,0,0.25); padding: 0.6rem; border-radius: 6px; font-size: 0.8rem; margin-top: 0.5rem;">
              <div><strong>Causa Principal:</strong> ${evHSE.motivoPrincipal || 'Condiciones Inseguras'}</div>
              ${evHSE.fallasObservadas?.length ? `<div style="margin-top: 0.2rem;"><strong>Desvíos:</strong> ${evHSE.fallasObservadas.join('; ')}</div>` : ''}
              ${evHSE.observaciones ? `<div style="margin-top: 0.2rem;"><strong>Notas Inspector:</strong> "${evHSE.observaciones}"</div>` : ''}
              <div style="margin-top: 0.3rem; font-size: 0.72rem; color: #fecaca;">
                Bloqueado por: ${evHSE.inspectorNombre || 'Inspector HSE'} · ${evHSE.fecha ? new Date(evHSE.fecha).toLocaleString() : ''}
              </div>
            </div>
            ${evHSE.fotoEvidencia ? `
              <div style="margin-top: 0.6rem; display: flex; align-items: center; gap: 0.6rem;">
                <img src="${evHSE.fotoEvidencia}" style="width: 70px; height: 50px; object-fit: cover; border-radius: 4px; border: 2px solid #fff; cursor: pointer;" onclick="abrirModalFotoHSE('${evHSE.fotoEvidencia}', 'Registro Fotográfico del Desvío HSE')" title="Click para ampliar">
                <span style="font-size: 0.75rem; color: #fff; cursor: pointer; text-decoration: underline;" onclick="abrirModalFotoHSE('${evHSE.fotoEvidencia}', 'Registro Fotográfico del Desvío HSE')">
                  🔍 Ver foto de la anomalía en grande
                </span>
              </div>
            ` : ''}
          ` : ''}
        </div>
      ` : esHabilitado ? `
        <div style="background: #15803d; color: #fff; padding: 0.85rem 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.6rem;">
          <span style="font-size: 1.5rem;">🟢</span>
          <div>
            <div style="font-weight: 800; font-size: 1rem;">ANDAMIO HABILITADO — ESTRUCTURA SEGURA</div>
            <div style="font-size: 0.8rem; color: #dcfce7;">
              Tarjeta Verde en vigencia · Apto para uso seguro según normas ARAUCO.
            </div>
          </div>
        </div>
      ` : esAlquiler ? `
        <div style="background: #b45309; color: #fff; padding: 0.85rem 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.6rem;">
          <span style="font-size: 1.5rem;">🟡</span>
          <div>
            <div style="font-weight: 800; font-size: 1rem;">ANDAMIO EN ALQUILER (> 30 DÍAS DE PERMANENCIA)</div>
            <div style="font-size: 0.8rem; color: #fef3c7;">
              Superó el periodo libre de montaje · Días acumulados: ${sol.diasPermanencia || 31}
            </div>
          </div>
        </div>
      ` : `
        <div style="background: #334155; color: #fff; padding: 0.85rem 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <strong>Estado Operativo:</strong> ${sol.estado}
        </div>
      `}

      <!-- Datos Técnicos y de Terreno -->
      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border); border-radius: 8px; padding: 0.85rem; margin-bottom: 1rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.6rem; font-size: 0.85rem;">
          <div><strong style="color: var(--text-muted);">N° Correlativo:</strong> <span style="color: #38bdf8; font-weight: 700;">${sol.numeroCorrelativo || sol.id}</span></div>
          <div><strong style="color: var(--text-muted);">Ubicación / Tag:</strong> <strong>${sol.ubicacionTecnica || sol.sector}</strong></div>
          <div><strong style="color: var(--text-muted);">Sector / Área:</strong> ${sol.sector}</div>
          <div><strong style="color: var(--text-muted);">Empresa Contratista:</strong> <strong>${sol.proveedorAsignado || 'Sin Asignar'}</strong></div>
          <div><strong style="color: var(--text-muted);">Solicitante ARAUCO:</strong> ${sol.solicitanteNombre || 'ARAUCO'}</div>
          <div><strong style="color: var(--text-muted);">Volumen / Plataforma:</strong> <span style="color: #38bdf8; font-weight: 700;">${vol} m³</span> · <span style="color: #4ade80; font-weight: 700;">${sup} m²</span></div>
          <div><strong style="color: var(--text-muted);">Fecha Montaje:</strong> ${sol.fechaArmado ? new Date(sol.fechaArmado).toLocaleDateString() : 'Pendiente'}</div>
          <div><strong style="color: var(--text-muted);">Permanencia:</strong> ${sol.diasPermanencia || 0} días</div>
        </div>

        ${sol.fotoAndamioMontado ? `
          <div style="margin-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.6rem; display: flex; align-items: center; gap: 0.75rem;">
            <img src="${sol.fotoAndamioMontado}" style="width: 70px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border); cursor: pointer;" onclick="abrirModalFotoHSE('${sol.fotoAndamioMontado}', 'Fotografía Oficial de Montaje - ${sol.numeroCorrelativo}')" title="Click para ampliar">
            <span style="font-size: 0.78rem; color: #94a3b8; cursor: pointer; text-decoration: underline;" onclick="abrirModalFotoHSE('${sol.fotoAndamioMontado}', 'Fotografía Oficial de Montaje - ${sol.numeroCorrelativo}')">
              🖼️ Ver fotografía oficial del montaje
            </span>
          </div>
        ` : ''}
      </div>

      <!-- Barra de Acciones Inmediatas -->
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end;">
        ${esHSE && !esDeshabilitadoHSE ? `
          <button class="btn" onclick="cerrarModalBuscadorQR(); abrirModalDeshabilitarHSE('${sol.id}')" style="background: #dc2626; color: #fff; font-weight: 700; padding: 0.4rem 0.8rem; font-size: 0.82rem; border-radius: 6px;">
            🚫 Deshabilitar Andamio (HSE)
          </button>
        ` : ''}

        ${esHSE && esDeshabilitadoHSE ? `
          <button class="btn" onclick="cerrarModalBuscadorQR(); abrirModalRehabilitarHSE('${sol.id}')" style="background: #15803d; color: #fff; font-weight: 700; padding: 0.4rem 0.8rem; font-size: 0.82rem; border-radius: 6px;">
            🟢 Re-Habilitar Andamio (HSE)
          </button>
        ` : ''}

        ${esContratista && esDeshabilitadoHSE ? `
          <button class="btn" onclick="cerrarModalBuscadorQR(); abrirModalSubsanarHSE('${sol.id}')" style="background: #eab308; color: #000; font-weight: 700; padding: 0.4rem 0.8rem; font-size: 0.82rem; border-radius: 6px;">
            🔧 Enviar Subsanación
          </button>
        ` : ''}

        <button class="btn btn-outline" onclick="imprimirTarjetaHabilitacion(${JSON.stringify(sol).replace(/"/g, '&quot;')})" style="padding: 0.4rem 0.8rem; font-size: 0.82rem;">
          🖨️ Ver Tarjeta
        </button>

        <button class="btn btn-outline" onclick="window.open('/verificar.html?id=' + encodeURIComponent('${sol.numeroCorrelativo || sol.id}'), '_blank')" style="padding: 0.4rem 0.8rem; font-size: 0.82rem;">
          🌐 Ficha Web Terreno
        </button>
      </div>

    </div>
  `;
}
