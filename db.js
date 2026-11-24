import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

export function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(plain), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(plain, stored) {
  if (!stored || plain === undefined || plain === null) return false;
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const [, salt, originalHash] = parts;
    const derived = crypto.scryptSync(String(plain), salt, 64);
    const originalBuf = Buffer.from(originalHash, 'hex');
    if (derived.length !== originalBuf.length) return false;
    return crypto.timingSafeEqual(derived, originalBuf);
  }
  return String(plain) === String(stored);
}

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

const LIMITES_MENSUALES_BASE = {
  cantidadAndamiosMes: 50,
  limiteM3Mes: 1500,
  limiteM2Mes: 600,
  presupuestoMes: 0,
  porcentajeAdvertencia: 80
};

const INITIAL_DATA = {
  correlativo: 0,
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
      id: 'USR-ADM-DIEGO2026',
      nombre: 'Diego2026',
      email: 'diego2026@arauco.com',
      password: 'scrypt$ba9ee47c225650c943c29c37f729d86e$ac541e78f8ec665a048552eb4ab226aef7b0a9162976080150991c65322a22868ea74e92a248af8e423e1ca9f1d7bcdd6c8113295999b3fdbf536c702e9847fd',
      rol: 'GESTIONADOR',
      sector: 'Administración General de Andamios y Paradas',
      legajo: 'ADM-2026',
      centroCostos: 'CC-SUP-00'
    }
  ],
  empresasServicio: [],
  solicitudes: [],
  incidentesArea: [],
  tarifarios: TARIFARIOS_BASE,
  limitesMensuales: { ...LIMITES_MENSUALES_BASE },
  usoApp: { totalLogins: 0, ultimosAccesos: [], porUsuario: {} }
};

export function getDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    return INITIAL_DATA;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    let updated = false;
    if (!parsed.tarifarios || !parsed.tarifarios.items18 || parsed.tarifarios.items18[0].valor === 0) {
      parsed.tarifarios = TARIFARIOS_BASE;
      updated = true;
    }
    if (!parsed.limitesMensuales) {
      parsed.limitesMensuales = { ...LIMITES_MENSUALES_BASE };
      updated = true;
    }
    if (!Array.isArray(parsed.empresasServicio)) {
      parsed.empresasServicio = [];
      updated = true;
    }
    if (!parsed.usoApp) {
      parsed.usoApp = { totalLogins: 0, ultimosAccesos: [], porUsuario: {} };
      updated = true;
    }
    if (updated) {
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

  // 3. Empresas de Servicio (EESS)
  if (data.empresasServicio && data.empresasServicio.length > 0) {
    const rowsEmps = data.empresasServicio.map(e => ({
      id: e.id,
      nombre: e.nombre,
      cuit: e.cuit || null,
      contacto: e.contacto || null,
      telefono: e.telefono || null,
      email: e.email || null,
      activo: e.activa !== false
    }));
    await supabase.from('empresas_servicio').upsert(rowsEmps, { onConflict: 'id' });
  }

  // 4. Tarifarios, Límites Mensuales y Correlativo
  if (data.tarifarios) {
    await supabase.from('configuracion').upsert({ clave: 'tarifarios', valor: data.tarifarios }, { onConflict: 'clave' });
  }
  if (data.limitesMensuales) {
    await supabase.from('configuracion').upsert({ clave: 'limites_mensuales', valor: data.limitesMensuales }, { onConflict: 'clave' });
  }
  if (data.correlativo !== undefined) {
    await supabase.from('configuracion').upsert({ clave: 'correlativo', valor: { ultimo: data.correlativo } }, { onConflict: 'clave' });
  }
  if (data.usoApp) {
    await supabase.from('configuracion').upsert({ clave: 'uso_app', valor: data.usoApp }, { onConflict: 'clave' });
  }
}

export async function eliminarEmpresaEnSupabase(id) {
  if (!supabase) return;
  try {
    await supabase.from('empresas_servicio').delete().eq('id', id);
  } catch (err) {
    console.error('⚠️ Error eliminando EESS en Supabase:', err.message);
  }
}

export async function eliminarUsuarioEnSupabase(id) {
  if (!supabase) return;
  try {
    await supabase.from('usuarios').delete().eq('id', id);
  } catch (err) {
    console.error('⚠️ Error eliminando usuario en Supabase:', err.message);
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
      const lim = configs.find(c => c.clave === 'limites_mensuales');
      if (lim && lim.valor) db.limitesMensuales = lim.valor;
      const corr = configs.find(c => c.clave === 'correlativo');
      if (corr && corr.valor?.ultimo !== undefined) db.correlativo = corr.valor.ultimo;
      const uso = configs.find(c => c.clave === 'uso_app');
      if (uso && uso.valor) db.usoApp = uso.valor;
    }
    if (emps) {
      db.empresasServicio = emps.map(e => ({
        id: e.id,
        nombre: e.nombre,
        cuit: e.cuit || '',
        contacto: e.contacto || '',
        telefono: e.telefono || '',
        email: e.email || '',
        activa: e.activo !== false
      }));
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
