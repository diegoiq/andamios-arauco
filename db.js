import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Configuración de Cliente Supabase (Híbrido)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

if (supabase) {
  console.log('⚡ Conexión activa con Supabase PostgreSQL:', SUPABASE_URL);
} else {
  console.log('📁 Modo Base de Datos Local activa (data/db.json). Para conectar con Supabase configure SUPABASE_URL y SUPABASE_KEY.');
}

// Tarifario base oficial para validación financiera
const TARIFARIOS_BASE = {
  items18: [
    { id: 1, codigo: 'CF-MTTO', nombre: 'Canon Fijo Mantenimiento', unidad: 'Global/Mes', valor: 450000, cantidadMes: 1 },
    { id: 2, codigo: 'CF-PROD', nombre: 'Canon Fijo Producción', unidad: 'Global/Mes', valor: 380000, cantidadMes: 1 },
    { id: 3, codigo: 'AND-HAB', nombre: 'Andamios Nuevos (días hábiles)', unidad: 'm³', valor: 1250 },
    { id: 4, codigo: 'AND-SAB-NOC', nombre: 'Andamios Nuevos Sábados y Nocturno', unidad: 'm³', valor: 1650 },
    { id: 5, codigo: 'AND-DOM-FER', nombre: 'Andamios Nuevos Domingo y Feriado', unidad: 'm³', valor: 2100 },
    { id: 6, codigo: 'AND-ALQ', nombre: 'Andamios Alquilados (>30 días)', unidad: 'm³', valor: 650 },
    { id: 7, codigo: 'PLAT-HAB', nombre: 'Plataformas (días hábiles)', unidad: 'm²', valor: 950 },
    { id: 8, codigo: 'PLAT-SAB-NOC', nombre: 'Plataformas Sábados y Nocturno', unidad: 'm²', valor: 1280 },
    { id: 9, codigo: 'PLAT-DOM-FER', nombre: 'Plataformas Nuevos Domingo y Feriado', unidad: 'm²', valor: 1600 },
    { id: 10, codigo: 'PLAT-ALQ', nombre: 'Plataformas (alquilados)', unidad: 'm²', valor: 480 },
    { id: 11, codigo: 'EST-HAB', nombre: 'Estructuras (días hábiles)', unidad: 'm³', valor: 1100 },
    { id: 12, codigo: 'EST-SAB-NOC', nombre: 'Estructuras Nuevos Sábados y Nocturno', unidad: 'm³', valor: 1450 },
    { id: 13, codigo: 'EST-DOM-FER', nombre: 'Estructuras Nuevos Domingo y Feriado', unidad: 'm³', valor: 1900 },
    { id: 14, codigo: 'EST-ALQ', nombre: 'Estructuras (alquilados)', unidad: 'm³', valor: 550 },
    { id: 15, codigo: 'PISO-INF-CR', nombre: 'Pisos de seguridad INF CR', unidad: 'Unid/m²', valor: 85000 },
    { id: 16, codigo: 'PISO-SUP-CR', nombre: 'Pisos de seguridad SUP CR', unidad: 'Unid/m²', valor: 95000 },
    { id: 17, codigo: 'PISO-CP', nombre: 'Pisos de seguridad CP', unidad: 'Unid/m²', valor: 110000 },
    { id: 18, codigo: 'GRILLA-MOV-CP', nombre: 'Entablonado Grilla móvil CP', unidad: 'Unid/m²', valor: 135000 }
  ],
  pgp: {
    valorM3Andamio: 1850,
    valorM2Plataforma: 1400
  }
};

const SOLICITUDES_DEMO = [
  {
    id: 'SOL-DEMO-01',
    numeroCorrelativo: '01-00005117',
    tarjetaId: 'HAB-01-00005117',
    tipoOperacion: 'ANUAL',
    estado: 'HABILITADO',
    sectorSolicitante: 'Mantenimiento',
    oportunidadTrabajo: 'Marcha normal',
    solicitanteId: 'USR-SOL-01',
    solicitanteNombre: 'Juan Pérez (Mantenimiento)',
    legajo: '74821',
    sector: 'Mantenimiento Mecánico',
    puestoTrabajoResp: 'Taller Central',
    centroCostos: 'CC-MTTO-01',
    motivo: 'Reparación de válvula de seguridad vapor',
    ubicacionTecnica: 'Caldera de Recuperación - Nivel +12m',
    tiposAndamio: ['Plataforma trabajo', 'Baranda protección'],
    itemEspecialCaldera: 'PISO_INF_CR',
    regimenHorarioEstimado: 'HABILES',
    dimSolicitadaAndamio: { ancho: 2.0, largo: 3.0, alto: 4.5, volumenM3: 27.0 },
    dimSolicitadaPlataforma: { nPlat: 1, ancho: 2.0, largo: 3.0, superficieM2: 6.0 },
    observaciones: 'Andamio prioritario para parada corta de caldera',
    fotoReferencia: '',
    proveedorAsignado: 'Andamios del Sur S.A.',
    fechaProgramada: '2026-11-10',
    prioridad: 'ALTA',
    indicacionesGestionador: 'Instalar con doble baranda y rodapiés perimetral.',
    acuseReciboEjecutante: { fecha: '2026-11-10T08:30:00Z', supervisor: 'Carlos Méndez' },
    dimensionesRealesAndamio: [{ ancho: 2.0, largo: 3.0, alto: 4.5, volumenM3: 27.0 }],
    dimensionesRealesPlataforma: [{ nPlat: 1, ancho: 2.0, largo: 3.0, superficieM2: 6.0 }],
    totalVolumenRealM3: 27.0,
    totalSuperficieRealM2: 6.0,
    regimenHorarioReal: 'HABILES',
    checklistHabilitacion: { todosAprobados: true },
    nTarjetaFisica: 'TARJ-5117',
    fotoAndamioMontado: '/solicitud_modelo_arauco.jpg',
    fotoCartelHabilitacion: '',
    fotoAndamioDesmontado: '',
    fechaCreacion: '2026-11-09T10:00:00Z',
    fechaArmado: '2026-11-10T14:00:00Z',
    fechaLimite30Dias: '2026-12-10T14:00:00Z',
    diasPermanencia: 6,
    fechaSolicitudDesarme: null,
    fechaDesarmado: null,
    indicacionesDesarme: ''
  },
  {
    id: 'SOL-DEMO-02',
    numeroCorrelativo: '01-00005118',
    tarjetaId: 'HAB-01-00005118',
    tipoOperacion: 'ANUAL',
    estado: 'EN_ALQUILER',
    sectorSolicitante: 'Producción',
    oportunidadTrabajo: 'Marcha normal',
    solicitanteId: 'USR-SOL-02',
    solicitanteNombre: 'Carlos Gómez (Producción)',
    legajo: '81290',
    sector: 'Línea de Fibra',
    puestoTrabajoResp: 'Supervisión Turno A',
    centroCostos: 'CC-PROD-02',
    motivo: 'Inspección de cañería de pasta blanqueada',
    ubicacionTecnica: 'Línea de Fibra - Torre de Blanqueo D0',
    tiposAndamio: ['Plataforma trabajo', 'Estructura protección'],
    itemEspecialCaldera: 'NINGUNO',
    regimenHorarioEstimado: 'HABILES',
    dimSolicitadaAndamio: { ancho: 2.5, largo: 2.5, alto: 6.0, volumenM3: 37.5 },
    dimSolicitadaPlataforma: { nPlat: 2, ancho: 2.5, largo: 2.5, superficieM2: 12.5 },
    observaciones: 'Permanencia prolongada por fisura de conducto',
    fotoReferencia: '',
    proveedorAsignado: 'Montajes Industriales S.A.',
    fechaProgramada: '2026-10-10',
    prioridad: 'NORMAL',
    indicacionesGestionador: 'Verificar apoyos sobre estructura metálica fija',
    acuseReciboEjecutante: { fecha: '2026-10-10T09:00:00Z', supervisor: 'Marcos Rivas' },
    dimensionesRealesAndamio: [{ ancho: 2.5, largo: 2.5, alto: 6.0, volumenM3: 37.5 }],
    dimensionesRealesPlataforma: [{ nPlat: 2, ancho: 2.5, largo: 2.5, superficieM2: 12.5 }],
    totalVolumenRealM3: 37.5,
    totalSuperficieRealM2: 12.5,
    regimenHorarioReal: 'HABILES',
    checklistHabilitacion: { todosAprobados: true },
    nTarjetaFisica: 'TARJ-4980',
    fotoAndamioMontado: '/solicitud_modelo_arauco.jpg',
    fotoCartelHabilitacion: '',
    fotoAndamioDesmontado: '',
    fechaCreacion: '2026-10-08T11:00:00Z',
    fechaArmado: '2026-10-10T16:00:00Z',
    fechaLimite30Dias: '2026-11-09T16:00:00Z',
    diasPermanencia: 37,
    fechaSolicitudDesarme: null,
    fechaDesarmado: null,
    indicacionesDesarme: ''
  },
  {
    id: 'SOL-DEMO-03',
    numeroCorrelativo: '01-00005119',
    tarjetaId: 'HAB-01-00005119',
    tipoOperacion: 'PARADA_GENERAL',
    estado: 'HABILITADO',
    sectorSolicitante: 'Mantenimiento',
    oportunidadTrabajo: 'Parada general',
    solicitanteId: 'USR-SOL-01',
    solicitanteNombre: 'Juan Pérez (Mantenimiento)',
    legajo: '74821',
    sector: 'Calderas y Energía',
    puestoTrabajoResp: 'Parada General PGP',
    centroCostos: 'CC-PGP-01',
    motivo: 'Inspección de sobrecalentador secundario',
    ubicacionTecnica: 'Caldera de Poder - Nivel +24m',
    tiposAndamio: ['Plataforma trabajo', 'Estructura carpa'],
    itemEspecialCaldera: 'PISO_CP',
    regimenHorarioEstimado: 'SABADO_NOCTURNO',
    dimSolicitadaAndamio: { ancho: 3.0, largo: 4.0, alto: 8.0, volumenM3: 96.0 },
    dimSolicitadaPlataforma: { nPlat: 3, ancho: 3.0, largo: 4.0, superficieM2: 36.0 },
    observaciones: 'Andamio de gran porte para PGP',
    fotoReferencia: '',
    proveedorAsignado: 'Andamios del Sur S.A.',
    fechaProgramada: '2026-11-15',
    prioridad: 'URGENTE',
    indicacionesGestionador: 'Montaje con cuadrilla reforzada de noche',
    acuseReciboEjecutante: { fecha: '2026-11-15T20:00:00Z', supervisor: 'Carlos Méndez' },
    dimensionesRealesAndamio: [{ ancho: 3.0, largo: 4.0, alto: 8.0, volumenM3: 96.0 }],
    dimensionesRealesPlataforma: [{ nPlat: 3, ancho: 3.0, largo: 4.0, superficieM2: 36.0 }],
    totalVolumenRealM3: 96.0,
    totalSuperficieRealM2: 36.0,
    regimenHorarioReal: 'SABADO_NOCTURNO',
    checklistHabilitacion: { todosAprobados: true },
    nTarjetaFisica: 'TARJ-5119',
    fotoAndamioMontado: '/solicitud_modelo_arauco.jpg',
    fotoCartelHabilitacion: '',
    fotoAndamioDesmontado: '',
    fechaCreacion: '2026-11-14T08:00:00Z',
    fechaArmado: '2026-11-15T22:30:00Z',
    fechaLimite30Dias: null,
    diasPermanencia: 1,
    fechaSolicitudDesarme: null,
    fechaDesarmado: null,
    indicacionesDesarme: ''
  }
];

const INITIAL_DATA = {
  correlativo: 5120,
  usuarios: [
    {
      id: 'USR-ADM-00',
      nombre: 'Diego A. Cristaldo (Admin ARAUCO)',
      email: 'diego.a.cristaldo@arauco.com',
      password: 'Arauco!2026',
      rol: 'GESTIONADOR',
      sector: 'Administración General de Andamios y Paradas',
      legajo: '50100',
      centroCostos: 'CC-SUP-00'
    },
    {
      id: 'USR-SOL-01',
      nombre: 'Juan Pérez (Mantenimiento)',
      email: 'juan.perez@arauco.com',
      password: 'Arauco!2026',
      rol: 'SOLICITANTE',
      sector: 'Mantenimiento Mecánico',
      legajo: '74821',
      centroCostos: 'CC-MTTO-01'
    },
    {
      id: 'USR-SOL-02',
      nombre: 'Carlos Gómez (Producción)',
      email: 'carlos.gomez@arauco.com',
      password: 'Arauco!2026',
      rol: 'SOLICITANTE',
      sector: 'Línea de Fibra',
      legajo: '81290',
      centroCostos: 'CC-PROD-02'
    },
    {
      id: 'USR-ADM-01',
      nombre: 'Ing. Marcelo Rossi (Gestionador ARAUCO)',
      email: 'marcelo.rossi@arauco.com',
      password: 'Arauco!2026',
      rol: 'GESTIONADOR',
      sector: 'Supervisión Andamios Planta',
      legajo: '50102',
      centroCostos: 'CC-SUP-00'
    },
    {
      id: 'USR-EJC-01',
      nombre: 'Andamios del Sur S.A. (Supervisor)',
      email: 'supervisor@andamiosdelsur.com',
      password: 'Arauco!2026',
      rol: 'EMPRESA_SERVICIO',
      empresaNombre: 'Andamios del Sur S.A.',
      legajo: 'EXT-104'
    },
    {
      id: 'USR-EJC-02',
      nombre: 'Montajes Industriales S.A. (Supervisor)',
      email: 'operaciones@montajesind.com',
      password: 'Arauco!2026',
      rol: 'EMPRESA_SERVICIO',
      empresaNombre: 'Montajes Industriales S.A.',
      legajo: 'EXT-208'
    },
    {
      id: 'USR-HSE-01',
      nombre: 'Lic. Roberto Varela (Seguridad HSE)',
      email: 'auditor.hse@arauco.com',
      password: 'Arauco!2026',
      rol: 'GESTIONADOR',
      sector: 'Seguridad Industrial y Medio Ambiente (HSE)',
      legajo: '50109',
      centroCostos: 'CC-HSE-01'
    }
  ],
  empresasServicio: [
    { id: 'EMP-01', nombre: 'Andamios del Sur S.A.', cuit: '30-71000000-1', activa: true },
    { id: 'EMP-02', nombre: 'Montajes Industriales S.A.', cuit: '30-71222222-2', activa: true }
  ],
  solicitudes: SOLICITUDES_DEMO,
  incidentesArea: [],
  tarifarios: TARIFARIOS_BASE
};

export function getDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    return INITIAL_DATA;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.tarifarios || !parsed.tarifarios.items18 || parsed.tarifarios.items18[0].valor === 0) {
      parsed.tarifarios = TARIFARIOS_BASE;
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch (err) {
    console.error('Error leyendo base de datos, restaurando estructura:', err);
    return INITIAL_DATA;
  }
}

export function saveDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error escribiendo en db.json local:', err);
  }

  // Sincronizar en la nube si Supabase está conectado
  if (supabase) {
    persistirEnSupabase(data).catch(err => {
      console.error('⚠️ Error al sincronizar cambios en Supabase:', err.message);
    });
  }
}

async function persistirEnSupabase(data) {
  if (!supabase) return;

  // 1. Usuarios
  if (data.usuarios && data.usuarios.length > 0) {
    const rowsUsuarios = data.usuarios.map(u => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      password: u.password,
      rol: u.rol,
      perfil_tipo: u.perfilTipo || null,
      sector: u.sector || null,
      legajo: u.legajo || null,
      centro_costos: u.centroCostos || null,
      empresa_nombre: u.empresaNombre || null,
      recuperacion: u.recuperacion || null
    }));
    await supabase.from('usuarios').upsert(rowsUsuarios, { onConflict: 'id' });
  }

  // 2. Solicitudes y Parque de Andamios
  if (data.solicitudes && data.solicitudes.length > 0) {
    const rowsSol = data.solicitudes.map(s => ({
      id: s.id,
      numero_correlativo: s.numeroCorrelativo,
      tarjeta_id: s.tarjetaId,
      tipo_operacion: s.tipoOperacion || 'ANUAL',
      estado: s.estado || 'SOLICITADO',
      sector_solicitante: s.sectorSolicitante || null,
      solicitante_id: s.solicitanteId || null,
      solicitante_nombre: s.solicitanteNombre || null,
      legajo: s.legajo || null,
      sector: s.sector || null,
      centro_costos: s.centroCostos || null,
      ubicacion_tecnica: s.ubicacionTecnica || null,
      proveedor_asignado: s.proveedorAsignado || null,
      fecha_programada: s.fechaProgramada || null,
      prioridad: s.prioridad || 'NORMAL',
      total_volumen_real_m3: s.totalVolumenRealM3 || 0,
      total_superficie_real_m2: s.totalSuperficieRealM2 || 0,
      payload: s
    }));
    await supabase.from('solicitudes').upsert(rowsSol, { onConflict: 'id' });
  }

  // 3. Tarifarios y Correlativo
  if (data.tarifarios) {
    await supabase.from('configuracion').upsert({ clave: 'tarifarios', valor: data.tarifarios }, { onConflict: 'clave' });
  }
  if (data.correlativo) {
    await supabase.from('configuracion').upsert({ clave: 'correlativo', valor: { ultimo: data.correlativo } }, { onConflict: 'clave' });
  }
}

export async function cargarDesdeSupabaseSiExiste() {
  if (!supabase) return;
  try {
    console.log('🔄 Sincronizando datos desde Supabase...');
    const { data: users, error: errU } = await supabase.from('usuarios').select('*');
    const { data: sols, error: errS } = await supabase.from('solicitudes').select('*');
    const { data: configs } = await supabase.from('configuracion').select('*');
    const { data: emps } = await supabase.from('empresas_servicio').select('*');

    if (errU || errS) {
      console.warn('⚠️ Tablas aún no inicializadas en Supabase (ejecute supabase_schema.sql en el SQL Editor).');
      return;
    }

    const db = getDb();
    if (users && users.length > 0) {
      db.usuarios = users.map(u => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        password: u.password,
        rol: u.rol,
        perfilTipo: u.perfil_tipo,
        sector: u.sector,
        legajo: u.legajo,
        centroCostos: u.centro_costos,
        empresaNombre: u.empresa_nombre,
        recuperacion: u.recuperacion
      }));
    }
    if (sols && sols.length > 0) {
      db.solicitudes = sols.map(s => s.payload || s);
    }
    if (configs && configs.length > 0) {
      const t = configs.find(c => c.clave === 'tarifarios');
      if (t && t.valor) db.tarifarios = t.valor;
      const corr = configs.find(c => c.clave === 'correlativo');
      if (corr && corr.valor?.ultimo) db.correlativo = corr.valor.ultimo;
    }
    if (emps && emps.length > 0) {
      db.empresasServicio = emps;
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    console.log('✅ Base de datos local sincronizada con éxito desde Supabase.');
  } catch (err) {
    console.error('⚠️ Error al cargar desde Supabase:', err.message);
  }
}

export function getNextNumeroCorrelativo() {
  const db = getDb();
  db.correlativo += 1;
  saveDb(db);
  const numPadded = String(db.correlativo).padStart(8, '0');
  return `01-${numPadded}`;
}

export function getNextTarjetaId(numeroCorrelativo) {
  return `HAB-${numeroCorrelativo}`;
}
