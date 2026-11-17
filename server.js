import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { getDb, saveDb, getNextNumeroCorrelativo, getNextTarjetaId, cargarDesdeSupabaseSiExiste } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración de almacenamiento para fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${ext}`);
  }
});
const upload = multer({ storage });

/* ========================================================
   AUTENTICACIÓN Y METADATOS
   ======================================================== */
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = getDb();
  const user = db.usuarios.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());

  if (!user || user.password !== password) {
    return res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos. Verifique sus credenciales.' });
  }

  const { password: _, ...userSafe } = user;
  res.json({ ok: true, user: userSafe });
});

// Registro de Nuevos Usuarios con Perfil Seleccionable
app.post('/api/auth/register', (req, res) => {
  const { nombre, email, password, perfil, sector, centroCostos, legajo, empresaNombre, funcionObra } = req.body;

  if (!nombre || !email || !password || !perfil) {
    return res.status(400).json({ ok: false, error: 'Por favor complete todos los campos obligatorios: Nombre, Correo, Perfil y Contraseña.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return res.status(400).json({ ok: false, error: 'Ingrese una dirección de correo electrónico válida.' });
  }

  if (password.length < 4) {
    return res.status(400).json({ ok: false, error: 'La contraseña debe contener al menos 4 caracteres.' });
  }

  const db = getDb();
  const existe = db.usuarios.find(u => u.email.toLowerCase() === cleanEmail);
  if (existe) {
    return res.status(400).json({ ok: false, error: `Ya existe una cuenta registrada con el correo: ${cleanEmail}. Inicie sesión o recupere su contraseña.` });
  }

  let rol = 'SOLICITANTE';
  let sectorFinal = sector || '';
  let ccFinal = centroCostos || '';
  let empresaFinal = empresaNombre || '';

  if (perfil === 'SOLICITANTE_MTO') {
    rol = 'SOLICITANTE';
    sectorFinal = sectorFinal || 'Mantenimiento Mecánico';
    ccFinal = ccFinal || 'CC-MTTO-01';
  } else if (perfil === 'SOLICITANTE_PROD') {
    rol = 'SOLICITANTE';
    sectorFinal = sectorFinal || 'Producción';
    ccFinal = ccFinal || 'CC-PROD-02';
  } else if (perfil === 'EJECUTOR_EESS') {
    rol = 'EMPRESA_SERVICIO';
    empresaFinal = empresaFinal || 'Empresa de Servicios';
    sectorFinal = funcionObra || 'Servicios de Montaje en Planta';
    ccFinal = 'CC-EXT';
  }

  const nuevoUsuario = {
    id: `USR-REG-${Date.now()}`,
    nombre: nombre.trim(),
    email: cleanEmail,
    password: password,
    rol,
    perfilTipo: perfil,
    sector: sectorFinal,
    legajo: legajo ? legajo.trim() : `REG-${Math.floor(10000 + Math.random() * 90000)}`,
    centroCostos: ccFinal,
    empresaNombre: empresaFinal,
    fechaRegistro: new Date().toISOString()
  };

  db.usuarios.push(nuevoUsuario);
  saveDb(db);

  const { password: _, ...userSafe } = nuevoUsuario;
  res.json({
    ok: true,
    mensaje: `¡Cuenta creada exitosamente! Bienvenido/a ${nuevoUsuario.nombre}.`,
    user: userSafe
  });
});

app.post('/api/auth/cambiar-password', (req, res) => {
  const { userId, passwordActual, passwordNueva } = req.body;
  if (!passwordNueva || passwordNueva.length < 4) {
    return res.status(400).json({ ok: false, error: 'La nueva contraseña debe tener al menos 4 caracteres' });
  }
  const db = getDb();
  const user = db.usuarios.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
  }
  if (user.password !== passwordActual) {
    return res.status(401).json({ ok: false, error: 'La contraseña actual ingresada es incorrecta' });
  }
  user.password = passwordNueva;
  saveDb(db);
  res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente' });
});

// Solicitud de código de seguridad para recuperar contraseña
app.post('/api/auth/solicitar-recuperacion', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ ok: false, error: 'Ingrese un correo electrónico corporativo' });

  const db = getDb();
  const user = db.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ ok: false, error: 'No existe usuario registrado con el correo: ' + email });
  }

  // Generar código PIN de 6 dígitos con validez de 15 minutos
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const expira = Date.now() + 15 * 60 * 1000;

  user.recuperacion = {
    codigo,
    expira,
    fechaSolicitud: new Date().toISOString()
  };

  saveDb(db);

  // En entorno corporativo se envía vía SMTP/Microsoft 365. En la PWA devolvemos el código para feedback inmediato
  res.json({
    ok: true,
    mensaje: `Se ha generado el código de verificación para ${user.email}. Válido por 15 minutos.`,
    email: user.email,
    codigoSimulado: codigo
  });
});

// Restablecer contraseña con código de verificación
app.post('/api/auth/restablecer-password', (req, res) => {
  const { email, codigo, passwordNueva } = req.body;
  if (!email || !codigo || !passwordNueva) {
    return res.status(400).json({ ok: false, error: 'Faltan campos requeridos (correo, código o contraseña)' });
  }

  if (passwordNueva.length < 4) {
    return res.status(400).json({ ok: false, error: 'La nueva contraseña debe tener al menos 4 caracteres' });
  }

  const db = getDb();
  const user = db.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
  }

  if (!user.recuperacion || !user.recuperacion.codigo) {
    return res.status(400).json({ ok: false, error: 'No hay ninguna solicitud de recuperación activa para esta cuenta' });
  }

  if (Date.now() > user.recuperacion.expira) {
    delete user.recuperacion;
    saveDb(db);
    return res.status(400).json({ ok: false, error: 'El código de verificación ha expirado. Solicite uno nuevo.' });
  }

  if (user.recuperacion.codigo.trim() !== codigo.toString().trim()) {
    return res.status(401).json({ ok: false, error: 'Código de verificación incorrecto' });
  }

  // Actualizar contraseña y limpiar estado de recuperación
  user.password = passwordNueva;
  delete user.recuperacion;
  saveDb(db);

  res.json({
    ok: true,
    mensaje: '¡Contraseña restablecida exitosamente! Ya puede iniciar sesión con su nueva clave.'
  });
});

app.get('/api/usuarios/demo', (req, res) => {
  const db = getDb();
  const demoUsers = db.usuarios.map(({ password, ...u }) => u);
  res.json({ ok: true, usuarios: demoUsers });
});

app.get('/api/empresas', (req, res) => {
  const db = getDb();
  res.json({ ok: true, empresas: db.empresasServicio });
});

/* ========================================================
   TARIFARIOS Y CERTIFICACIÓN OFICIAL (ETAPA 5)
   ======================================================== */
app.get('/api/tarifarios', (req, res) => {
  const db = getDb();
  res.json({ ok: true, tarifarios: db.tarifarios });
});

app.post('/api/tarifarios', (req, res) => {
  const { items18, pgp } = req.body;
  const db = getDb();

  if (items18 && Array.isArray(items18)) {
    db.tarifarios.items18 = items18;
  }
  if (pgp) {
    db.tarifarios.pgp = pgp;
  }

  saveDb(db);
  res.json({ ok: true, tarifarios: db.tarifarios });
});

// Liquidación y cómputo de la Sección de Certificación Oficial
app.get('/api/certificacion/liquidar', (req, res) => {
  const { periodo, empresaNombre } = req.query; // periodo opcional
  const db = getDb();
  const solicitudes = db.solicitudes || [];
  const tarifarios = db.tarifarios;

  // Filtrar solicitudes computables (habilitadas, alquiler o desarmadas)
  let elegibles = solicitudes.filter(s => ['HABILITADO', 'EN_ALQUILER', 'DESARME_SOLICITADO', 'DESARMADO'].includes(s.estado));

  if (empresaNombre && empresaNombre !== 'TODAS') {
    elegibles = elegibles.filter(s => s.proveedorAsignado === empresaNombre);
  }

  // Separar en Anuales (Marcha Normal) vs Parada General (PGP)
  const anuales = elegibles.filter(s => s.tipoOperacion === 'ANUAL');
  const pgp = elegibles.filter(s => s.tipoOperacion === 'PARADA_GENERAL');

  // 1. LIQUIDACIÓN DE LOS 18 ÍTEMS OFICIALES (MARCHA NORMAL)
  const items18Calculados = tarifarios.items18.map(item => {
    let cant = 0;

    switch (item.id) {
      case 1: // Canon Fijo Mantenimiento
      case 2: // Canon Fijo Producción
        cant = item.cantidadMes || 1;
        break;

      case 3: // Andamios Nuevos (días hábiles)
        anuales.filter(s => s.estado !== 'EN_ALQUILER' && (s.regimenHorarioReal === 'HABILES' || !s.regimenHorarioReal)).forEach(s => {
          cant += (s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0);
        });
        break;

      case 4: // Andamios Nuevos Sábados y Nocturno
        anuales.filter(s => s.estado !== 'EN_ALQUILER' && s.regimenHorarioReal === 'SABADO_NOCTURNO').forEach(s => {
          cant += (s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0);
        });
        break;

      case 5: // Andamios Nuevos Domingo y Feriado
        anuales.filter(s => s.estado !== 'EN_ALQUILER' && s.regimenHorarioReal === 'DOMINGO_FERIADO').forEach(s => {
          cant += (s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0);
        });
        break;

      case 6: // Andamios Alquilados (>30 días o sector alquiler)
        anuales.filter(s => s.estado === 'EN_ALQUILER' || s.sectorSolicitante === 'Alquiler').forEach(s => {
          cant += (s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0);
        });
        break;

      case 7: // Plataformas (días hábiles)
        anuales.filter(s => s.estado !== 'EN_ALQUILER' && (s.regimenHorarioReal === 'HABILES' || !s.regimenHorarioReal)).forEach(s => {
          cant += (s.totalSuperficieRealM2 || s.dimSolicitadaPlataforma?.superficieM2 || 0);
        });
        break;

      case 8: // Plataformas Sábados y Nocturno
        anuales.filter(s => s.estado !== 'EN_ALQUILER' && s.regimenHorarioReal === 'SABADO_NOCTURNO').forEach(s => {
          cant += (s.totalSuperficieRealM2 || s.dimSolicitadaPlataforma?.superficieM2 || 0);
        });
        break;

      case 9: // Plataformas Nuevos Domingo y Feriado
        anuales.filter(s => s.estado !== 'EN_ALQUILER' && s.regimenHorarioReal === 'DOMINGO_FERIADO').forEach(s => {
          cant += (s.totalSuperficieRealM2 || s.dimSolicitadaPlataforma?.superficieM2 || 0);
        });
        break;

      case 10: // Plataformas (alquilados)
        anuales.filter(s => s.estado === 'EN_ALQUILER' || s.sectorSolicitante === 'Alquiler').forEach(s => {
          cant += (s.totalSuperficieRealM2 || s.dimSolicitadaPlataforma?.superficieM2 || 0);
        });
        break;

      case 11: // Estructuras (días hábiles)
        anuales.filter(s => (s.tiposAndamio || []).some(t => t.includes('Estructura')) && s.regimenHorarioReal === 'HABILES').forEach(s => {
          cant += (s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0);
        });
        break;

      case 12: // Estructuras Nuevos Sábados y Nocturno
        anuales.filter(s => (s.tiposAndamio || []).some(t => t.includes('Estructura')) && s.regimenHorarioReal === 'SABADO_NOCTURNO').forEach(s => {
          cant += (s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0);
        });
        break;

      case 13: // Estructuras Nuevos Domingo y Feriado
        anuales.filter(s => (s.tiposAndamio || []).some(t => t.includes('Estructura')) && s.regimenHorarioReal === 'DOMINGO_FERIADO').forEach(s => {
          cant += (s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0);
        });
        break;

      case 14: // Estructuras (alquilados)
        anuales.filter(s => (s.tiposAndamio || []).some(t => t.includes('Estructura')) && (s.estado === 'EN_ALQUILER' || s.sectorSolicitante === 'Alquiler')).forEach(s => {
          cant += (s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0);
        });
        break;

      case 15: // Pisos de seguridad INF CR
        cant = anuales.filter(s => s.itemEspecialCaldera === 'PISO_INF_CR').length;
        break;

      case 16: // Pisos de seguridad SUP CR
        cant = anuales.filter(s => s.itemEspecialCaldera === 'PISO_SUP_CR').length;
        break;

      case 17: // Pisos de seguridad CP
        cant = anuales.filter(s => s.itemEspecialCaldera === 'PISO_CP').length;
        break;

      case 18: // Entablonado Grilla móvil CP
        cant = anuales.filter(s => s.itemEspecialCaldera === 'GRILLA_MOVIL_CP').length;
        break;

      default:
        cant = 0;
    }

    const cantidadRedondeada = parseFloat(cant.toFixed(2));
    const subtotal = parseFloat((cantidadRedondeada * (item.valor || 0)).toFixed(2));

    return {
      ...item,
      cantidad: cantidadRedondeada,
      subtotal
    };
  });

  const totalMonetarioAnual = parseFloat(items18Calculados.reduce((acc, curr) => acc + curr.subtotal, 0).toFixed(2));

  // 2. LIQUIDACIÓN DIRECTA DE PARADA GENERAL (PGP POR M3 Y M2)
  let totalM3PGP = 0;
  let totalM2PGP = 0;

  pgp.forEach(s => {
    totalM3PGP += (s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0);
    totalM2PGP += (s.totalSuperficieRealM2 || s.dimSolicitadaPlataforma?.superficieM2 || 0);
  });

  totalM3PGP = parseFloat(totalM3PGP.toFixed(2));
  totalM2PGP = parseFloat(totalM2PGP.toFixed(2));

  const subtotalM3PGP = parseFloat((totalM3PGP * (tarifarios.pgp?.valorM3Andamio || 0)).toFixed(2));
  const subtotalM2PGP = parseFloat((totalM2PGP * (tarifarios.pgp?.valorM2Plataforma || 0)).toFixed(2));
  const totalMonetarioPGP = parseFloat((subtotalM3PGP + subtotalM2PGP).toFixed(2));

  res.json({
    ok: true,
    certificacion: {
      anual: {
        items: items18Calculados,
        totalMonetario: totalMonetarioAnual,
        totalAndamiosComputados: anuales.length
      },
      pgp: {
        totalAndamiosComputados: pgp.length,
        totalM3Andamio: totalM3PGP,
        valorM3Andamio: tarifarios.pgp?.valorM3Andamio || 0,
        subtotalM3: subtotalM3PGP,
        totalM2Plataforma: totalM2PGP,
        valorM2Plataforma: tarifarios.pgp?.valorM2Plataforma || 0,
        subtotalM2: subtotalM2PGP,
        totalMonetario: totalMonetarioPGP
      },
      granTotalCertificado: parseFloat((totalMonetarioAnual + totalMonetarioPGP).toFixed(2))
    }
  });
});

/* ========================================================
   ENDPOINTS GENERALES DE SOLICITUDES
   ======================================================== */
app.get('/api/solicitudes', (req, res) => {
  const { rol, usuarioId, empresaNombre, tipoOperacion, estado } = req.query;
  const db = getDb();
  let list = db.solicitudes || [];

  if (tipoOperacion) list = list.filter(s => s.tipoOperacion === tipoOperacion);
  if (estado) list = list.filter(s => s.estado === estado);

  if (rol === 'SOLICITANTE' && usuarioId) {
    list = list.filter(s => s.solicitanteId === usuarioId);
  } else if (rol === 'EMPRESA_SERVICIO' && empresaNombre) {
    list = list.filter(s => s.proveedorAsignado === empresaNombre);
  }

  const ahora = new Date();
  list.forEach(s => {
    if (s.fechaArmado && ['HABILITADO', 'EN_ALQUILER'].includes(s.estado)) {
      const fArm = new Date(s.fechaArmado);
      const diffDias = Math.floor((ahora - fArm) / (1000 * 60 * 60 * 24));
      s.diasPermanencia = diffDias > 0 ? diffDias : 1;
      if (s.tipoOperacion === 'ANUAL' && s.diasPermanencia > 30 && s.estado === 'HABILITADO') {
        s.estado = 'EN_ALQUILER';
      }
    }
  });
  saveDb(db);

  list.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
  res.json({ ok: true, solicitudes: list });
});

app.get('/api/solicitudes/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const sol = db.solicitudes.find(s => s.id === id);
  if (!sol) return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' });
  res.json({ ok: true, solicitud: sol });
});

// Crear una solicitud individual
app.post('/api/solicitudes', (req, res) => {
  const db = getDb();
  const data = req.body;

  const numeroCorrelativo = getNextNumeroCorrelativo();
  const tarjetaId = getNextTarjetaId(numeroCorrelativo);

  const nuevaSolicitud = {
    id: `SOL-${Date.now()}`,
    numeroCorrelativo,
    tarjetaId,
    tipoOperacion: data.tipoOperacion || 'ANUAL',
    estado: 'SOLICITADO',
    
    sectorSolicitante: data.sectorSolicitante || 'Mantenimiento',
    oportunidadTrabajo: data.oportunidadTrabajo || 'Marcha normal',
    
    solicitanteId: data.solicitanteId || '',
    solicitanteNombre: data.solicitanteNombre || '',
    legajo: data.legajo || '',
    sector: data.sector || '',
    puestoTrabajoResp: data.puestoTrabajoResp || '',
    centroCostos: data.centroCostos || '',
    motivo: data.motivo || '',
    ubicacionTecnica: data.ubicacionTecnica || '',
    
    tiposAndamio: data.tiposAndamio || [],
    itemEspecialCaldera: data.itemEspecialCaldera || 'NINGUNO',
    regimenHorarioEstimado: data.regimenHorarioEstimado || 'HABILES',

    dimSolicitadaAndamio: {
      ancho: parseFloat(data.dimSolicitadaAndamio?.ancho || 0),
      largo: parseFloat(data.dimSolicitadaAndamio?.largo || 0),
      alto: parseFloat(data.dimSolicitadaAndamio?.alto || 0),
      volumenM3: parseFloat(((data.dimSolicitadaAndamio?.ancho || 0) * 
                             (data.dimSolicitadaAndamio?.largo || 0) * 
                             (data.dimSolicitadaAndamio?.alto || 0)).toFixed(2))
    },
    dimSolicitadaPlataforma: {
      nPlat: parseInt(data.dimSolicitadaPlataforma?.nPlat || 0),
      ancho: parseFloat(data.dimSolicitadaPlataforma?.ancho || 0),
      largo: parseFloat(data.dimSolicitadaPlataforma?.largo || 0),
      superficieM2: parseFloat(((data.dimSolicitadaPlataforma?.nPlat || 0) * 
                                (data.dimSolicitadaPlataforma?.ancho || 0) * 
                                (data.dimSolicitadaPlataforma?.largo || 0)).toFixed(2))
    },

    observaciones: data.observaciones || '',
    fotoReferencia: data.fotoReferencia || '',

    estado: data.autoAprobar && data.proveedorAsignado ? 'PROGRAMADO' : 'SOLICITADO',
    proveedorAsignado: data.proveedorAsignado || '',
    fechaProgramada: data.fechaProgramada || (data.autoAprobar ? new Date().toISOString().split('T')[0] : null),
    prioridad: data.prioridad || 'NORMAL',
    indicacionesGestionador: data.indicacionesGestionador || (data.autoAprobar ? 'Orden de oficio generada y despachada directamente por Administración ARAUCO' : ''),
    acuseReciboEjecutante: null,

    dimensionesRealesAndamio: [],
    dimensionesRealesPlataforma: [],
    totalVolumenRealM3: 0,
    totalSuperficieRealM2: 0,
    regimenHorarioReal: 'HABILES',
    checklistHabilitacion: null,
    nTarjetaFisica: '',
    fotoAndamioMontado: '',
    fotoCartelHabilitacion: '',
    fotoAndamioDesmontado: '',
    auditoriaGestionador: null,

    fechaCreacion: new Date().toISOString(),
    fechaArmado: null,
    fechaLimite30Dias: null,
    diasPermanencia: 0,
    fechaSolicitudDesarme: null,
    fechaDesarmado: null,
    indicacionesDesarme: '',
    estadoMaterialDesarme: null,
    
    loteImportacionId: null,
    copiadoDeSolicitud: data.copiadoDeSolicitud || null
  };

  db.solicitudes.push(nuevaSolicitud);
  saveDb(db);

  res.json({ ok: true, solicitud: nuevaSolicitud });
});

// Carga Masiva de Pedidos (PGP)
app.post('/api/solicitudes/carga-masiva', (req, res) => {
  const db = getDb();
  const { pedidos, solicitanteId, solicitanteNombre, sector, centroCostos, legajo } = req.body;

  if (!pedidos || !Array.isArray(pedidos) || pedidos.length === 0) {
    return res.status(400).json({ ok: false, error: 'No se enviaron registros válidos para importar' });
  }

  const loteId = `LOTE-PGP-${Date.now()}`;
  const importadas = [];

  let sumVolumenM3 = 0;
  let sumSuperficieM2 = 0;

  pedidos.forEach(item => {
    const numeroCorrelativo = getNextNumeroCorrelativo();
    const tarjetaId = getNextTarjetaId(numeroCorrelativo);

    const anchoAnd = parseFloat(item.anchoAndamio || item.ancho || 0);
    const largoAnd = parseFloat(item.largoAndamio || item.largo || 0);
    const altoAnd = parseFloat(item.altoAndamio || item.alto || 0);
    const volM3 = parseFloat((anchoAnd * largoAnd * altoAnd).toFixed(2));

    const nPlat = parseInt(item.nPlat || item.cantidadPlataformas || 0);
    const anchoPlat = parseFloat(item.anchoPlat || anchoAnd || 0);
    const largoPlat = parseFloat(item.largoPlat || largoAnd || 0);
    const supM2 = parseFloat((nPlat * anchoPlat * largoPlat).toFixed(2));

    sumVolumenM3 += volM3;
    sumSuperficieM2 += supM2;

    const nuevaSol = {
      id: `SOL-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      numeroCorrelativo,
      tarjetaId,
      loteImportacionId: loteId,
      tipoOperacion: 'PARADA_GENERAL',
      estado: 'SOLICITADO',
      
      sectorSolicitante: item.sectorSolicitante || 'Mantenimiento',
      oportunidadTrabajo: 'Parada general',
      
      solicitanteId: solicitanteId || '',
      solicitanteNombre: solicitanteNombre || item.solicitante || '',
      legajo: legajo || item.legajo || '',
      sector: sector || item.sector || '',
      puestoTrabajoResp: item.puestoTrabajoResp || '',
      centroCostos: centroCostos || item.centroCostos || '',
      motivo: item.motivo || 'Parada General de Planta (PGP)',
      ubicacionTecnica: item.ubicacionTecnica || item.ubicacion || 'Sector Planta',
      
      tiposAndamio: Array.isArray(item.tiposAndamio) ? item.tiposAndamio : ['Plataforma trabajo'],
      itemEspecialCaldera: item.itemEspecialCaldera || 'NINGUNO',
      regimenHorarioEstimado: item.regimenHorarioEstimado || 'HABILES',

      dimSolicitadaAndamio: { ancho: anchoAnd, largo: largoAnd, alto: altoAnd, volumenM3: volM3 },
      dimSolicitadaPlataforma: { nPlat: nPlat, ancho: anchoPlat, largo: largoPlat, superficieM2: supM2 },

      observaciones: item.observaciones || '',
      fotoReferencia: '',

      proveedorAsignado: '',
      fechaProgramada: null,
      prioridad: item.prioridad || 'NORMAL',
      indicacionesGestionador: '',
      acuseReciboEjecutante: null,

      dimensionesRealesAndamio: [],
      dimensionesRealesPlataforma: [],
      totalVolumenRealM3: 0,
      totalSuperficieRealM2: 0,
      regimenHorarioReal: 'HABILES',
      checklistHabilitacion: null,
      nTarjetaFisica: '',
      fotoAndamioMontado: '',
      fotoCartelHabilitacion: '',
      fotoAndamioDesmontado: '',
      auditoriaGestionador: null,

      fechaCreacion: new Date().toISOString(),
      fechaArmado: null,
      fechaLimite30Dias: null,
      diasPermanencia: 0,
      fechaSolicitudDesarme: null,
      fechaDesarmado: null,
      indicacionesDesarme: '',
      estadoMaterialDesarme: null
    };

    db.solicitudes.push(nuevaSol);
    importadas.push(nuevaSol);
  });

  saveDb(db);

  res.json({
    ok: true,
    loteId,
    totalPedidos: importadas.length,
    metricasRecepcion: {
      totalAndamios: importadas.length,
      totalVolumenM3: parseFloat(sumVolumenM3.toFixed(2)),
      totalSuperficieM2: parseFloat(sumSuperficieM2.toFixed(2))
    },
    solicitudes: importadas
  });
});

/* ========================================================
   ACCIONES DE LA EMPRESA EJECUTORA
   ======================================================== */
app.post('/api/ejecutante/acuse-recibo/:id', (req, res) => {
  const { id } = req.params;
  const { supervisorNombre } = req.body;
  const db = getDb();
  const sol = db.solicitudes.find(s => s.id === id);

  if (!sol) return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' });

  sol.estado = 'EN_SITIO';
  sol.acuseReciboEjecutante = {
    fecha: new Date().toISOString(),
    supervisor: supervisorNombre || 'Supervisor Contratista'
  };

  saveDb(db);
  res.json({ ok: true, solicitud: sol });
});

app.post('/api/ejecutante/reportar-impedimento/:id', (req, res) => {
  const { id } = req.params;
  const { causal, comentario, fotoUrl, reportadoPor } = req.body;
  const db = getDb();
  const sol = db.solicitudes.find(s => s.id === id);

  if (!sol) return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' });

  sol.estado = 'IMPEDIDO';
  sol.incidenteArea = {
    causal: causal || 'Acceso obstruido / Falta de permiso',
    comentario: comentario || '',
    fotoUrl: fotoUrl || '',
    reportadoPor: reportadoPor || 'Cuadrilla Andamista',
    fechaReporte: new Date().toISOString()
  };

  saveDb(db);
  res.json({ ok: true, solicitud: sol });
});

app.post('/api/ejecutante/habilitar-andamio/:id', (req, res) => {
  const { id } = req.params;
  const {
    dimensionesRealesAndamio,
    dimensionesRealesPlataforma,
    regimenHorarioReal,
    itemEspecialCaldera,
    checklist11Puntos,
    nTarjetaFisica,
    fotoAndamioMontado,
    fotoCartelHabilitacion,
    firmaSupervisorAndamista
  } = req.body;

  const db = getDb();
  const sol = db.solicitudes.find(s => s.id === id);

  if (!sol) return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' });

  let totalM3 = 0;
  let totalM2 = 0;

  if (Array.isArray(dimensionesRealesAndamio)) {
    dimensionesRealesAndamio.forEach(row => {
      const vol = parseFloat((row.ancho * row.largo * row.alto).toFixed(2));
      row.volumenM3 = vol;
      totalM3 += vol;
    });
  }

  if (Array.isArray(dimensionesRealesPlataforma)) {
    dimensionesRealesPlataforma.forEach(row => {
      const sup = parseFloat((row.nPlat * row.ancho * row.largo).toFixed(2));
      row.superficieM2 = sup;
      totalM2 += sup;
    });
  }

  const ahora = new Date();
  sol.estado = 'HABILITADO';
  sol.dimensionesRealesAndamio = dimensionesRealesAndamio || [];
  sol.dimensionesRealesPlataforma = dimensionesRealesPlataforma || [];
  sol.totalVolumenRealM3 = parseFloat(totalM3.toFixed(2));
  sol.totalSuperficieRealM2 = parseFloat(totalM2.toFixed(2));
  sol.regimenHorarioReal = regimenHorarioReal || 'HABILES';
  if (itemEspecialCaldera) sol.itemEspecialCaldera = itemEspecialCaldera;

  sol.checklistHabilitacion = checklist11Puntos || {};
  sol.nTarjetaFisica = nTarjetaFisica || sol.tarjetaId;
  sol.fotoAndamioMontado = fotoAndamioMontado || '/solicitud_modelo_arauco.jpg';
  sol.fotoCartelHabilitacion = fotoCartelHabilitacion || '';
  sol.firmaSupervisorAndamista = firmaSupervisorAndamista || 'Firmado Digitalmente';

  sol.fechaArmado = ahora.toISOString();
  sol.fechaLimite30Dias = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  sol.diasPermanencia = 1;

  saveDb(db);
  res.json({ ok: true, solicitud: sol });
});

app.post('/api/ejecutante/finalizar-desarme/:id', (req, res) => {
  const { id } = req.params;
  const { fotoAndamioDesmontado, estadoMaterial, detalleMaterial, fotoMaterial } = req.body;
  const db = getDb();
  const sol = db.solicitudes.find(s => s.id === id);

  if (!sol) return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' });

  sol.estado = 'DESARMADO';
  sol.fotoAndamioDesmontado = fotoAndamioDesmontado || '';
  sol.fechaDesarmado = new Date().toISOString();
  sol.estadoMaterialDesarme = {
    estado: estadoMaterial || 'NORMAL',
    detalle: detalleMaterial || 'Desarme completado sin novedades de material',
    foto: fotoMaterial || ''
  };

  saveDb(db);
  res.json({ ok: true, solicitud: sol });
});

app.get('/api/ejecutante/metricas/:empresaNombre', (req, res) => {
  const { empresaNombre } = req.params;
  const db = getDb();
  const mis = db.solicitudes.filter(s => s.proveedorAsignado === empresaNombre);

  const totalAsignados = mis.length;
  const pendientesArmar = mis.filter(s => ['PROGRAMADO', 'EN_SITIO', 'IMPEDIDO'].includes(s.estado)).length;
  const activos = mis.filter(s => ['HABILITADO', 'EN_ALQUILER'].includes(s.estado)).length;
  const pendientesDesarmar = mis.filter(s => s.estado === 'DESARME_SOLICITADO').length;
  const desarmados = mis.filter(s => s.estado === 'DESARMADO').length;

  let m3Ejecutados = 0;
  let m2Ejecutados = 0;
  mis.forEach(s => {
    if (['HABILITADO', 'EN_ALQUILER', 'DESARME_SOLICITADO', 'DESARMADO'].includes(s.estado)) {
      m3Ejecutados += (s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0);
      m2Ejecutados += (s.totalSuperficieRealM2 || s.dimSolicitadaPlataforma?.superficieM2 || 0);
    }
  });

  res.json({
    ok: true,
    metricas: {
      totalAsignados,
      pendientesArmar,
      activos,
      pendientesDesarmar,
      desarmados,
      m3Ejecutados: parseFloat(m3Ejecutados.toFixed(2)),
      m2Ejecutados: parseFloat(m2Ejecutados.toFixed(2))
    }
  });
});

/* ========================================================
   ACCIONES DEL GESTIONADOR DE ANDAMIOS (ADMIN)
   ======================================================== */
app.post('/api/gestionador/programar', (req, res) => {
  const { ids, proveedorAsignado, fechaProgramada, prioridad, indicacionesGestionador } = req.body;
  const db = getDb();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ ok: false, error: 'Debes indicar al menos un pedido' });
  }

  const actualizados = [];
  ids.forEach(id => {
    const sol = db.solicitudes.find(s => s.id === id);
    if (sol) {
      sol.estado = 'PROGRAMADO';
      sol.proveedorAsignado = proveedorAsignado || sol.proveedorAsignado;
      sol.fechaProgramada = fechaProgramada || new Date().toISOString().split('T')[0];
      sol.prioridad = prioridad || sol.prioridad;
      if (indicacionesGestionador) sol.indicacionesGestionador = indicacionesGestionador;
      sol.fechaAprobacion = new Date().toISOString();
      actualizados.push(sol);
    }
  });

  saveDb(db);
  res.json({ ok: true, actualizados: actualizados.length, solicitudes: actualizados });
});

app.post('/api/gestionador/reprogramar/:id', (req, res) => {
  const { id } = req.params;
  const { fechaProgramada, prioridad, proveedorAsignado, indicacionesGestionador } = req.body;
  const db = getDb();
  const sol = db.solicitudes.find(s => s.id === id);

  if (!sol) return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' });

  sol.fechaProgramada = fechaProgramada || sol.fechaProgramada;
  sol.prioridad = prioridad || sol.prioridad;
  if (proveedorAsignado) sol.proveedorAsignado = proveedorAsignado;
  if (indicacionesGestionador) sol.indicacionesGestionador = indicacionesGestionador;
  sol.estado = 'PROGRAMADO';

  saveDb(db);
  res.json({ ok: true, solicitud: sol });
});

app.post('/api/gestionador/anular/:id', (req, res) => {
  const { id } = req.params;
  const { motivoAnulacion } = req.body;
  const db = getDb();
  const sol = db.solicitudes.find(s => s.id === id);

  if (!sol) return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' });

  sol.estado = 'ANULADO';
  sol.motivoAnulacion = motivoAnulacion || 'Anulado por el Gestionador';
  sol.fechaAnulacion = new Date().toISOString();

  saveDb(db);
  res.json({ ok: true, solicitud: sol });
});

app.delete('/api/gestionador/solicitudes/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const idx = db.solicitudes.findIndex(s => s.id === id);

  if (idx === -1) return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' });

  const eliminada = db.solicitudes.splice(idx, 1)[0];
  saveDb(db);

  res.json({ ok: true, eliminada });
});

app.post('/api/gestionador/asignar-desarme/:id', (req, res) => {
  const { id } = req.params;
  const { proveedorAsignado, indicacionesDesarme, prioridad } = req.body;
  const db = getDb();
  const sol = db.solicitudes.find(s => s.id === id);

  if (!sol) return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' });

  sol.estado = 'DESARME_SOLICITADO';
  if (proveedorAsignado) sol.proveedorAsignado = proveedorAsignado;
  sol.indicacionesDesarme = indicacionesDesarme || 'Desmontar andamio con cuidado y dejar sector limpio';
  if (prioridad) sol.prioridad = prioridad;
  sol.fechaAsignacionDesarme = new Date().toISOString();

  saveDb(db);
  res.json({ ok: true, solicitud: sol });
});

app.get('/api/gestionador/metricas', (req, res) => {
  const db = getDb();
  const todas = db.solicitudes || [];

  const solicitados = todas.filter(s => s.estado === 'SOLICITADO').length;
  const programados = todas.filter(s => s.estado === 'PROGRAMADO').length;
  const enSitio = todas.filter(s => s.estado === 'EN_SITIO').length;
  const impedidos = todas.filter(s => s.estado === 'IMPEDIDO').length;
  const habilitados = todas.filter(s => s.estado === 'HABILITADO').length;
  const enAlquiler = todas.filter(s => s.estado === 'EN_ALQUILER').length;
  const desarmesPendientes = todas.filter(s => s.estado === 'DESARME_SOLICITADO').length;
  const desarmados = todas.filter(s => s.estado === 'DESARMADO').length;
  const anulados = todas.filter(s => s.estado === 'ANULADO').length;

  let m3ActivosPlanta = 0;
  let m2ActivosPlanta = 0;
  todas.forEach(s => {
    if (['HABILITADO', 'EN_ALQUILER'].includes(s.estado)) {
      m3ActivosPlanta += (s.totalVolumenRealM3 || s.dimSolicitadaAndamio?.volumenM3 || 0);
      m2ActivosPlanta += (s.totalSuperficieRealM2 || s.dimSolicitadaPlataforma?.superficieM2 || 0);
    }
  });

  res.json({
    ok: true,
    metricas: {
      total: todas.length,
      solicitados,
      programados,
      enSitio,
      impedidos,
      activosPlanta: habilitados + enAlquiler,
      habilitados,
      enAlquiler,
      desarmesPendientes,
      desarmados,
      anulados,
      m3ActivosPlanta: parseFloat(m3ActivosPlanta.toFixed(2)),
      m2ActivosPlanta: parseFloat(m2ActivosPlanta.toFixed(2))
    }
  });
});

app.post('/api/solicitudes/:id/solicitar-desarme', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const sol = db.solicitudes.find(s => s.id === id);

  if (!sol) return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' });

  sol.estado = 'DESARME_SOLICITADO';
  sol.fechaSolicitudDesarme = new Date().toISOString();
  saveDb(db);

  res.json({ ok: true, solicitud: sol });
});

app.get('/api/solicitudes/metricas-solicitante/:usuarioId', (req, res) => {
  const { usuarioId } = req.params;
  const db = getDb();
  const mis = db.solicitudes.filter(s => s.solicitanteId === usuarioId);

  const totalPedidos = mis.length;
  const anuales = mis.filter(s => s.tipoOperacion === 'ANUAL').length;
  const pgp = mis.filter(s => s.tipoOperacion === 'PARADA_GENERAL').length;
  const activos = mis.filter(s => ['HABILITADO', 'EN_ALQUILER'].includes(s.estado)).length;
  const enAlquiler = mis.filter(s => s.estado === 'EN_ALQUILER').length;
  const paraDesarme = mis.filter(s => s.estado === 'DESARME_SOLICITADO').length;

  let totalM3Solicitado = 0;
  let totalM2Solicitado = 0;
  mis.forEach(s => {
    totalM3Solicitado += (s.dimSolicitadaAndamio?.volumenM3 || 0);
    totalM2Solicitado += (s.dimSolicitadaPlataforma?.superficieM2 || 0);
  });

  res.json({
    ok: true,
    metricas: {
      totalPedidos,
      anuales,
      pgp,
      activos,
      enAlquiler,
      paraDesarme,
      totalM3Solicitado: parseFloat(totalM3Solicitado.toFixed(2)),
      totalM2Solicitado: parseFloat(totalM2Solicitado.toFixed(2))
    }
  });
});

app.post('/api/upload', upload.single('foto'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'No se envió archivo' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ ok: true, url, filename: req.file.filename });
});

app.get('/api/sistema/info', (req, res) => {
  const db = getDb();
  res.json({
    ok: true,
    version: '1.0.0',
    correlativoActual: db.correlativo,
    totalSolicitudes: db.solicitudes.length,
    activosEnPlanta: db.solicitudes.filter(s => s.estado === 'HABILITADO' || s.estado === 'EN_ALQUILER').length
  });
});

/* ========================================================
   ETAPA 6: AUDITORÍA PRE-CERTIFICACIÓN Y TRAZABILIDAD QR
   ======================================================== */
// Consulta pública para escaneo QR de tarjeta física en planta
app.get('/api/solicitudes/verificar/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const sol = db.solicitudes.find(s => 
    (s.numeroCorrelativo && s.numeroCorrelativo.toLowerCase() === id.toLowerCase()) ||
    (s.tarjetaId && s.tarjetaId.toLowerCase() === id.toLowerCase()) ||
    s.id === id
  );

  if (!sol) {
    return res.status(404).json({ ok: false, error: 'Andamio no registrado o código inválido' });
  }

  // Actualizar días de permanencia si está activo
  if (sol.fechaArmado && ['HABILITADO', 'EN_ALQUILER'].includes(sol.estado)) {
    const fArm = new Date(sol.fechaArmado);
    const diffDias = Math.floor((new Date() - fArm) / (1000 * 60 * 60 * 24));
    sol.diasPermanencia = diffDias > 0 ? diffDias : 1;
    if (sol.tipoOperacion === 'ANUAL' && sol.diasPermanencia > 30 && sol.estado === 'HABILITADO') {
      sol.estado = 'EN_ALQUILER';
    }
  }

  // Devolver únicamente información técnica y de seguridad relevante para terreno
  res.json({
    ok: true,
    solicitud: {
      id: sol.id,
      numeroCorrelativo: sol.numeroCorrelativo,
      tarjetaId: sol.tarjetaId,
      estado: sol.estado,
      tipoOperacion: sol.tipoOperacion,
      sector: sol.sector,
      centroCostos: sol.centroCostos,
      ubicacionTecnica: sol.ubicacionTecnica,
      motivo: sol.motivo,
      proveedorAsignado: sol.proveedorAsignado,
      totalVolumenRealM3: sol.totalVolumenRealM3 || sol.dimSolicitadaAndamio?.volumenM3 || 0,
      totalSuperficieRealM2: sol.totalSuperficieRealM2 || sol.dimSolicitadaPlataforma?.superficieM2 || 0,
      regimenHorarioReal: sol.regimenHorarioReal,
      fechaArmado: sol.fechaArmado,
      fechaLimite30Dias: sol.fechaLimite30Dias,
      diasPermanencia: sol.diasPermanencia,
      fotoAndamioMontado: sol.fotoAndamioMontado,
      checklistHabilitacion: sol.checklistHabilitacion,
      estadoAuditoria: sol.estadoAuditoria || 'PENDIENTE_AUDITORIA',
      reformas: sol.reformas || []
    }
  });
});

// Mesa de Auditoría y Validación del Gestionador ARAUCO
app.post('/api/gestionador/auditar-solicitud/:id', (req, res) => {
  const { id } = req.params;
  const { accion, gestionadorNombre, nuevoVolumenM3, nuevaSuperficieM2, nuevoRegimen, motivoRectificacion, observacionesAuditoria } = req.body;
  const db = getDb();
  const sol = db.solicitudes.find(s => s.id === id);

  if (!sol) return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' });

  if (accion === 'VALIDAR') {
    sol.estadoAuditoria = 'VALIDADO';
    sol.fechaAuditoria = new Date().toISOString();
    sol.auditadoPor = gestionadorNombre || 'Gestionador ARAUCO';
  } else if (accion === 'RECTIFICAR') {
    sol.rectificacionGestionador = {
      volumenAnteriorM3: sol.totalVolumenRealM3,
      superficieAnteriorM2: sol.totalSuperficieRealM2,
      regimenAnterior: sol.regimenHorarioReal,
      motivo: motivoRectificacion || 'Ajuste de metraje según medición en terreno',
      fecha: new Date().toISOString(),
      gestionador: gestionadorNombre || 'Gestionador ARAUCO'
    };
    if (nuevoVolumenM3 !== undefined) sol.totalVolumenRealM3 = parseFloat(nuevoVolumenM3);
    if (nuevaSuperficieM2 !== undefined) sol.totalSuperficieRealM2 = parseFloat(nuevaSuperficieM2);
    if (nuevoRegimen) sol.regimenHorarioReal = nuevoRegimen;
    sol.estadoAuditoria = 'RECTIFICADO';
    sol.fechaAuditoria = new Date().toISOString();
    sol.auditadoPor = gestionadorNombre || 'Gestionador ARAUCO';
  } else if (accion === 'OBSERVAR') {
    sol.estadoAuditoria = 'OBSERVADO';
    sol.observacionesAuditoria = {
      detalle: observacionesAuditoria || 'Falta subsanar condiciones de seguridad o documentación',
      fecha: new Date().toISOString(),
      gestionador: gestionadorNombre || 'Gestionador ARAUCO'
    };
  } else {
    return res.status(400).json({ ok: false, error: 'Acción de auditoría no reconocida' });
  }

  saveDb(db);
  res.json({ ok: true, solicitud: sol, mensaje: `Auditoría registrada: ${sol.estadoAuditoria}` });
});

// Registro de Ampliaciones / Reformas sobre Andamios Activos
app.post('/api/solicitudes/:id/solicitar-reforma', (req, res) => {
  const { id } = req.params;
  const { solicitanteNombre, m3Adicionales, m2Adicionales, motivo, detalle } = req.body;
  const db = getDb();
  const sol = db.solicitudes.find(s => s.id === id);

  if (!sol) return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' });

  if (!sol.reformas) sol.reformas = [];

  const nuevaReforma = {
    id: `REF-${Date.now()}`,
    fechaSolicitud: new Date().toISOString(),
    solicitante: solicitanteNombre || sol.solicitanteNombre,
    m3Adicionales: parseFloat(m3Adicionales || 0),
    m2Adicionales: parseFloat(m2Adicionales || 0),
    motivo: motivo || 'Ampliación de estructura para nuevo punto de trabajo',
    detalle: detalle || '',
    estado: 'SOLICITADA'
  };

  sol.reformas.push(nuevaReforma);
  sol.tieneReformaPendiente = true;

  saveDb(db);
  res.json({ ok: true, solicitud: sol, reforma: nuevaReforma });
});

app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`  ANDAMIOS ARAUCO - Servidor PWA en ejecución`);
  console.log(`  URL local: http://localhost:${PORT}`);
  console.log(`====================================================`);
  await cargarDesdeSupabaseSiExiste();
});
