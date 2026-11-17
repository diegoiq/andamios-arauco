-- ========================================================
-- ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- PROYECTO: SISTEMA DE GESTION DE ANDAMIOS ARAUCO
-- ========================================================

-- 1. Tabla de Usuarios del Sistema
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  rol TEXT NOT NULL,
  perfil_tipo TEXT,
  sector TEXT,
  legajo TEXT,
  centro_costos TEXT,
  empresa_nombre TEXT,
  recuperacion JSONB,
  fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Empresas de Servicios Contratistas
CREATE TABLE IF NOT EXISTS empresas_servicio (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  cuit TEXT,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  activo BOOLEAN DEFAULT TRUE
);

-- 3. Tabla de Solicitudes y Parque de Andamios
CREATE TABLE IF NOT EXISTS solicitudes (
  id TEXT PRIMARY KEY,
  numero_correlativo TEXT,
  tarjeta_id TEXT,
  tipo_operacion TEXT NOT NULL DEFAULT 'ANUAL',
  estado TEXT NOT NULL DEFAULT 'SOLICITADO',
  sector_solicitante TEXT,
  solicitante_id TEXT,
  solicitante_nombre TEXT,
  legajo TEXT,
  sector TEXT,
  centro_costos TEXT,
  ubicacion_tecnica TEXT,
  proveedor_asignado TEXT,
  fecha_programada TEXT,
  prioridad TEXT DEFAULT 'NORMAL',
  total_volumen_real_m3 NUMERIC,
  total_superficie_real_m2 NUMERIC,
  payload JSONB NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Tarifarios y Configuración
CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor JSONB NOT NULL,
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- DATOS INICIALES PRE-CARGADOS
-- ========================================================

INSERT INTO usuarios (id, nombre, email, password, rol, perfil_tipo, sector, legajo, centro_costos, empresa_nombre, recuperacion)
VALUES ('USR-ADM-00', 'Diego A. Cristaldo (Admin ARAUCO)', 'diego.a.cristaldo@arauco.com', 'Arauco!2026', 'GESTIONADOR', '', 'Administración General de Andamios y Paradas', '50100', 'CC-SUP-00', '', NULL)
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password, rol = EXCLUDED.rol;
INSERT INTO usuarios (id, nombre, email, password, rol, perfil_tipo, sector, legajo, centro_costos, empresa_nombre, recuperacion)
VALUES ('USR-SOL-01', 'Juan Pérez (Mantenimiento)', 'juan.perez@arauco.com', 'Arauco!2026', 'SOLICITANTE', '', 'Mantenimiento', '74821', 'CC-MTTO-01', '', NULL)
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password, rol = EXCLUDED.rol;
INSERT INTO usuarios (id, nombre, email, password, rol, perfil_tipo, sector, legajo, centro_costos, empresa_nombre, recuperacion)
VALUES ('USR-SOL-02', 'Carlos Gómez (Producción)', 'carlos.gomez@arauco.com', 'Arauco!2026', 'SOLICITANTE', '', 'Producción', '81290', 'CC-PROD-02', '', NULL)
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password, rol = EXCLUDED.rol;
INSERT INTO usuarios (id, nombre, email, password, rol, perfil_tipo, sector, legajo, centro_costos, empresa_nombre, recuperacion)
VALUES ('USR-ADM-01', 'Ing. Marcelo Rossi (Gestionador ARAUCO)', 'marcelo.rossi@arauco.com', 'Arauco!2026', 'GESTIONADOR', '', 'Supervisión Andamios Planta', '50102', 'CC-SUP-00', '', NULL)
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password, rol = EXCLUDED.rol;
INSERT INTO usuarios (id, nombre, email, password, rol, perfil_tipo, sector, legajo, centro_costos, empresa_nombre, recuperacion)
VALUES ('USR-EJC-01', 'Andamios del Sur S.A. (Supervisor)', 'supervisor@andamiosdelsur.com', 'Arauco!2026', 'EMPRESA_SERVICIO', '', '', 'EXT-104', '', 'Andamios del Sur S.A.', NULL)
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password, rol = EXCLUDED.rol;
INSERT INTO usuarios (id, nombre, email, password, rol, perfil_tipo, sector, legajo, centro_costos, empresa_nombre, recuperacion)
VALUES ('USR-EJC-02', 'Montajes Industriales S.A. (Supervisor)', 'operaciones@montajesind.com', 'Arauco!2026', 'EMPRESA_SERVICIO', '', '', 'EXT-208', '', 'Montajes Industriales S.A.', NULL)
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password, rol = EXCLUDED.rol;
INSERT INTO usuarios (id, nombre, email, password, rol, perfil_tipo, sector, legajo, centro_costos, empresa_nombre, recuperacion)
VALUES ('USR-HSE-01', 'Lic. Roberto Varela (Seguridad HSE)', 'auditor.hse@arauco.com', 'Arauco!2026', 'GESTIONADOR', '', 'Seguridad Industrial y Medio Ambiente (HSE)', '50109', 'CC-HSE-01', '', NULL)
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password, rol = EXCLUDED.rol;
INSERT INTO empresas_servicio (id, nombre, cuit, contacto, telefono, email, activo)
VALUES ('EMP-01', 'Andamios del Sur S.A.', '30-71000000-1', 'undefined', 'undefined', 'undefined', undefined)
ON CONFLICT (id) DO NOTHING;
INSERT INTO empresas_servicio (id, nombre, cuit, contacto, telefono, email, activo)
VALUES ('EMP-02', 'Montajes Industriales S.A.', '30-71222222-2', 'undefined', 'undefined', 'undefined', undefined)
ON CONFLICT (id) DO NOTHING;
INSERT INTO configuracion (clave, valor)
VALUES ('tarifarios', '{"items18":[{"id":1,"codigo":"CF-MTTO","nombre":"Canon Fijo Mantenimiento","unidad":"Global/Mes","valor":450000,"cantidadMes":1},{"id":2,"codigo":"CF-PROD","nombre":"Canon Fijo Producción","unidad":"Global/Mes","valor":380000,"cantidadMes":1},{"id":3,"codigo":"AND-HAB","nombre":"Andamios Nuevos (días hábiles)","unidad":"m³","valor":1250},{"id":4,"codigo":"AND-SAB-NOC","nombre":"Andamios Nuevos Sábados y Nocturno","unidad":"m³","valor":1650},{"id":5,"codigo":"AND-DOM-FER","nombre":"Andamios Nuevos Domingo y Feriado","unidad":"m³","valor":2100},{"id":6,"codigo":"AND-ALQ","nombre":"Andamios Alquilados (>30 días)","unidad":"m³","valor":650},{"id":7,"codigo":"PLAT-HAB","nombre":"Plataformas (días hábiles)","unidad":"m²","valor":950},{"id":8,"codigo":"PLAT-SAB-NOC","nombre":"Plataformas Sábados y Nocturno","unidad":"m²","valor":1280},{"id":9,"codigo":"PLAT-DOM-FER","nombre":"Plataformas Nuevos Domingo y Feriado","unidad":"m²","valor":1600},{"id":10,"codigo":"PLAT-ALQ","nombre":"Plataformas (alquilados)","unidad":"m²","valor":480},{"id":11,"codigo":"EST-HAB","nombre":"Estructuras (días hábiles)","unidad":"m³","valor":1100},{"id":12,"codigo":"EST-SAB-NOC","nombre":"Estructuras Nuevos Sábados y Nocturno","unidad":"m³","valor":1450},{"id":13,"codigo":"EST-DOM-FER","nombre":"Estructuras Nuevos Domingo y Feriado","unidad":"m³","valor":1900},{"id":14,"codigo":"EST-ALQ","nombre":"Estructuras (alquilados)","unidad":"m³","valor":550},{"id":15,"codigo":"PISO-INF-CR","nombre":"Pisos de seguridad INF CR","unidad":"Unid/m²","valor":85000},{"id":16,"codigo":"PISO-SUP-CR","nombre":"Pisos de seguridad SUP CR","unidad":"Unid/m²","valor":95000},{"id":17,"codigo":"PISO-CP","nombre":"Pisos de seguridad CP","unidad":"Unid/m²","valor":110000},{"id":18,"codigo":"GRILLA-MOV-CP","nombre":"Entablonado Grilla móvil CP","unidad":"Unid/m²","valor":135000}],"pgp":{"valorM3Andamio":1850,"valorM2Plataforma":1400}}'::jsonb)
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;
INSERT INTO configuracion (clave, valor)
VALUES ('correlativo', '{"ultimo": 5119}'::jsonb)
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;
INSERT INTO solicitudes (id, numero_correlativo, tarjeta_id, tipo_operacion, estado, sector_solicitante, solicitante_id, solicitante_nombre, legajo, sector, centro_costos, ubicacion_tecnica, proveedor_asignado, fecha_programada, prioridad, total_volumen_real_m3, total_superficie_real_m2, payload)
VALUES ('SOL-DEMO-01', '01-00005117', 'HAB-01-00005117', 'ANUAL', 'HABILITADO', 'Mantenimiento', 'USR-SOL-01', 'Juan Pérez (Mantenimiento)', '74821', 'Mantenimiento Mecánico', 'CC-MTTO-01', 'Caldera de Recuperación - Nivel +12m', 'Andamios del Sur S.A.', '2026-11-10', 'ALTA', 48, 20, '{"id":"SOL-DEMO-01","numeroCorrelativo":"01-00005117","tarjetaId":"HAB-01-00005117","tipoOperacion":"ANUAL","estado":"HABILITADO","sectorSolicitante":"Mantenimiento","oportunidadTrabajo":"Marcha normal","solicitanteId":"USR-SOL-01","solicitanteNombre":"Juan Pérez (Mantenimiento)","legajo":"74821","sector":"Mantenimiento Mecánico","puestoTrabajoResp":"Taller Central","centroCostos":"CC-MTTO-01","motivo":"Reparación de válvula de seguridad vapor","ubicacionTecnica":"Caldera de Recuperación - Nivel +12m","tiposAndamio":["Plataforma trabajo","Baranda protección"],"itemEspecialCaldera":"PISO_INF_CR","regimenHorarioEstimado":"HABILES","dimSolicitadaAndamio":{"ancho":2,"largo":3,"alto":4.5,"volumenM3":27},"dimSolicitadaPlataforma":{"nPlat":1,"ancho":2,"largo":3,"superficieM2":6},"observaciones":"Andamio prioritario para parada corta de caldera","fotoReferencia":"","proveedorAsignado":"Andamios del Sur S.A.","fechaProgramada":"2026-11-10","prioridad":"ALTA","indicacionesGestionador":"Instalar con doble baranda y rodapiés perimetral.","acuseReciboEjecutante":{"fecha":"2026-11-10T08:30:00Z","supervisor":"Carlos Méndez"},"dimensionesRealesAndamio":[{"ancho":2,"largo":3,"alto":4.5,"volumenM3":27}],"dimensionesRealesPlataforma":[{"nPlat":1,"ancho":2,"largo":3,"superficieM2":6}],"totalVolumenRealM3":48,"totalSuperficieRealM2":20,"regimenHorarioReal":"SABADO_NOCTURNO","checklistHabilitacion":{"todosAprobados":true},"nTarjetaFisica":"TARJ-5117","fotoAndamioMontado":"/solicitud_modelo_arauco.jpg","fotoCartelHabilitacion":"","fotoAndamioDesmontado":"","fechaCreacion":"2026-11-09T10:00:00Z","fechaArmado":"2026-11-10T14:00:00Z","fechaLimite30Dias":"2026-12-10T14:00:00Z","diasPermanencia":7,"fechaSolicitudDesarme":null,"fechaDesarmado":null,"indicacionesDesarme":"","estadoAuditoria":"RECTIFICADO","fechaAuditoria":"2026-11-16T15:19:31.100Z","auditadoPor":"Ing. Marcelo Rossi","rectificacionGestionador":{"volumenAnteriorM3":27,"superficieAnteriorM2":6,"regimenAnterior":"HABILES","motivo":"Ajuste de campo por medición oficial","fecha":"2026-11-16T15:19:31.100Z","gestionador":"Ing. Marcelo Rossi"},"reformas":[{"id":"REF-1794842371109","fechaSolicitud":"2026-11-16T15:19:31.109Z","solicitante":"Juan Pérez","m3Adicionales":12,"m2Adicionales":6,"motivo":"Ampliación de altura para tolva","detalle":"","estado":"SOLICITADA"}],"tieneReformaPendiente":true}'::jsonb)
ON CONFLICT (id) DO NOTHING;
INSERT INTO solicitudes (id, numero_correlativo, tarjeta_id, tipo_operacion, estado, sector_solicitante, solicitante_id, solicitante_nombre, legajo, sector, centro_costos, ubicacion_tecnica, proveedor_asignado, fecha_programada, prioridad, total_volumen_real_m3, total_superficie_real_m2, payload)
VALUES ('SOL-DEMO-02', '01-00005118', 'HAB-01-00005118', 'ANUAL', 'EN_ALQUILER', 'Producción', 'USR-SOL-02', 'Carlos Gómez (Producción)', '81290', 'Línea de Fibra', 'CC-PROD-02', 'Línea de Fibra - Torre de Blanqueo D0', 'Montajes Industriales S.A.', '2026-10-10', 'NORMAL', 37.5, 12.5, '{"id":"SOL-DEMO-02","numeroCorrelativo":"01-00005118","tarjetaId":"HAB-01-00005118","tipoOperacion":"ANUAL","estado":"EN_ALQUILER","sectorSolicitante":"Producción","oportunidadTrabajo":"Marcha normal","solicitanteId":"USR-SOL-02","solicitanteNombre":"Carlos Gómez (Producción)","legajo":"81290","sector":"Línea de Fibra","puestoTrabajoResp":"Supervisión Turno A","centroCostos":"CC-PROD-02","motivo":"Inspección de cañería de pasta blanqueada","ubicacionTecnica":"Línea de Fibra - Torre de Blanqueo D0","tiposAndamio":["Plataforma trabajo","Estructura protección"],"itemEspecialCaldera":"NINGUNO","regimenHorarioEstimado":"HABILES","dimSolicitadaAndamio":{"ancho":2.5,"largo":2.5,"alto":6,"volumenM3":37.5},"dimSolicitadaPlataforma":{"nPlat":2,"ancho":2.5,"largo":2.5,"superficieM2":12.5},"observaciones":"Permanencia prolongada por fisura de conducto","fotoReferencia":"","proveedorAsignado":"Montajes Industriales S.A.","fechaProgramada":"2026-10-10","prioridad":"NORMAL","indicacionesGestionador":"Verificar apoyos sobre estructura metálica fija","acuseReciboEjecutante":{"fecha":"2026-10-10T09:00:00Z","supervisor":"Marcos Rivas"},"dimensionesRealesAndamio":[{"ancho":2.5,"largo":2.5,"alto":6,"volumenM3":37.5}],"dimensionesRealesPlataforma":[{"nPlat":2,"ancho":2.5,"largo":2.5,"superficieM2":12.5}],"totalVolumenRealM3":37.5,"totalSuperficieRealM2":12.5,"regimenHorarioReal":"HABILES","checklistHabilitacion":{"todosAprobados":true},"nTarjetaFisica":"TARJ-4980","fotoAndamioMontado":"/solicitud_modelo_arauco.jpg","fotoCartelHabilitacion":"","fotoAndamioDesmontado":"","fechaCreacion":"2026-10-08T11:00:00Z","fechaArmado":"2026-10-10T16:00:00Z","fechaLimite30Dias":"2026-11-09T16:00:00Z","diasPermanencia":37,"fechaSolicitudDesarme":null,"fechaDesarmado":null,"indicacionesDesarme":""}'::jsonb)
ON CONFLICT (id) DO NOTHING;
INSERT INTO solicitudes (id, numero_correlativo, tarjeta_id, tipo_operacion, estado, sector_solicitante, solicitante_id, solicitante_nombre, legajo, sector, centro_costos, ubicacion_tecnica, proveedor_asignado, fecha_programada, prioridad, total_volumen_real_m3, total_superficie_real_m2, payload)
VALUES ('SOL-DEMO-03', '01-00005119', 'HAB-01-00005119', 'PARADA_GENERAL', 'PROGRAMADO', 'Mantenimiento', 'USR-SOL-01', 'Juan Pérez (Mantenimiento)', '74821', 'Calderas y Energía', 'CC-PGP-01', 'Caldera de Poder - Nivel +24m', 'Andamios del Sur S.A.', '2026-11-17', 'URGENTE', 0, 0, '{"id":"SOL-DEMO-03","numeroCorrelativo":"01-00005119","tarjetaId":"HAB-01-00005119","tipoOperacion":"PARADA_GENERAL","estado":"PROGRAMADO","sectorSolicitante":"Mantenimiento","oportunidadTrabajo":"Parada general","solicitanteId":"USR-SOL-01","solicitanteNombre":"Juan Pérez (Mantenimiento)","legajo":"74821","sector":"Calderas y Energía","puestoTrabajoResp":"Parada General PGP","centroCostos":"CC-PGP-01","motivo":"Inspección de sobrecalentador secundario","ubicacionTecnica":"Caldera de Poder - Nivel +24m","tiposAndamio":["Plataforma trabajo","Estructura carpa"],"itemEspecialCaldera":"PISO_CP","regimenHorarioEstimado":"SABADO_NOCTURNO","dimSolicitadaAndamio":{"ancho":3,"largo":4,"alto":8,"volumenM3":96},"dimSolicitadaPlataforma":{"nPlat":3,"ancho":3,"largo":4,"superficieM2":36},"observaciones":"Andamio de gran porte para PGP","fotoReferencia":"","proveedorAsignado":"Andamios del Sur S.A.","fechaProgramada":"2026-11-17","prioridad":"URGENTE","indicacionesGestionador":"","acuseReciboEjecutante":null,"dimensionesRealesAndamio":[],"dimensionesRealesPlataforma":[],"totalVolumenRealM3":0,"totalSuperficieRealM2":0,"regimenHorarioReal":"HABILES","checklistHabilitacion":null,"nTarjetaFisica":"","fotoAndamioMontado":"","fotoCartelHabilitacion":"","fotoAndamioDesmontado":"","fechaCreacion":"2026-11-16T08:00:00Z","fechaArmado":null,"fechaLimite30Dias":null,"diasPermanencia":0,"fechaSolicitudDesarme":null,"fechaDesarmado":null,"indicacionesDesarme":"","fechaAprobacion":"2026-11-16T19:04:00.040Z"}'::jsonb)
ON CONFLICT (id) DO NOTHING;
INSERT INTO solicitudes (id, numero_correlativo, tarjeta_id, tipo_operacion, estado, sector_solicitante, solicitante_id, solicitante_nombre, legajo, sector, centro_costos, ubicacion_tecnica, proveedor_asignado, fecha_programada, prioridad, total_volumen_real_m3, total_superficie_real_m2, payload)
VALUES ('SOL-1794847781935', '01-00005120', 'HAB-01-00005120', 'ANUAL', 'PROGRAMADO', 'Supervisión / Gestión Andamios', 'USR-ADM-00', 'Diego A. Cristaldo', 'ARAUCO-ADM-01', 'Supervisión de Andamios y Paradas', 'CC-ADM-01', 'Subestación Eléctrica Principal - Transformador T3', 'Andamios del Sur S.A.', '2026-11-19', 'ALTA', 0, 0, '{"id":"SOL-1794847781935","numeroCorrelativo":"01-00005120","tarjetaId":"HAB-01-00005120","tipoOperacion":"ANUAL","estado":"PROGRAMADO","sectorSolicitante":"Supervisión / Gestión Andamios","oportunidadTrabajo":"Marcha normal","solicitanteId":"USR-ADM-00","solicitanteNombre":"Diego A. Cristaldo","legajo":"ARAUCO-ADM-01","sector":"Supervisión de Andamios y Paradas","puestoTrabajoResp":"","centroCostos":"CC-ADM-01","motivo":"Inspección de aisladores y canaletas de barras por mantenimiento mayor","ubicacionTecnica":"Subestación Eléctrica Principal - Transformador T3","tiposAndamio":["Andamio multidireccional"],"itemEspecialCaldera":"NINGUNO","regimenHorarioEstimado":"HABILES","dimSolicitadaAndamio":{"ancho":2.5,"largo":4,"alto":5,"volumenM3":50},"dimSolicitadaPlataforma":{"nPlat":2,"ancho":2,"largo":4,"superficieM2":16},"observaciones":"Prueba de emisión directa por Administrador General","fotoReferencia":"","proveedorAsignado":"Andamios del Sur S.A.","fechaProgramada":"2026-11-19","prioridad":"ALTA","indicacionesGestionador":"Orden directa emitida por Diego A. Cristaldo","acuseReciboEjecutante":null,"dimensionesRealesAndamio":[],"dimensionesRealesPlataforma":[],"totalVolumenRealM3":0,"totalSuperficieRealM2":0,"regimenHorarioReal":"HABILES","checklistHabilitacion":null,"nTarjetaFisica":"","fotoAndamioMontado":"","fotoCartelHabilitacion":"","fotoAndamioDesmontado":"","auditoriaGestionador":null,"fechaCreacion":"2026-11-16T16:49:41.935Z","fechaArmado":null,"fechaLimite30Dias":null,"diasPermanencia":0,"fechaSolicitudDesarme":null,"fechaDesarmado":null,"indicacionesDesarme":"","estadoMaterialDesarme":null,"loteImportacionId":null,"copiadoDeSolicitud":null,"fechaAprobacion":"2026-11-16T17:01:39.341Z"}'::jsonb)
ON CONFLICT (id) DO NOTHING;
INSERT INTO solicitudes (id, numero_correlativo, tarjeta_id, tipo_operacion, estado, sector_solicitante, solicitante_id, solicitante_nombre, legajo, sector, centro_costos, ubicacion_tecnica, proveedor_asignado, fecha_programada, prioridad, total_volumen_real_m3, total_superficie_real_m2, payload)
VALUES ('SOL-1794855801200', '01-00005121', 'HAB-01-00005121', 'ANUAL', 'HABILITADO', 'Mantenimiento', 'USR-SOL-01', 'Diego A. Cristaldo (Admin ARAUCO)', '12345', 'Mantenimiento', '340CRR', 'Chiller Vapor', 'Andamios del Sur S.A.', '2026-11-19', 'NORMAL', 35, 17.5, '{"id":"SOL-1794855801200","numeroCorrelativo":"01-00005121","tarjetaId":"HAB-01-00005121","tipoOperacion":"ANUAL","estado":"HABILITADO","sectorSolicitante":"Mantenimiento","oportunidadTrabajo":"Marcha normal","solicitanteId":"USR-SOL-01","solicitanteNombre":"Diego A. Cristaldo (Admin ARAUCO)","legajo":"12345","sector":"Mantenimiento","puestoTrabajoResp":"","centroCostos":"340CRR","motivo":"Reparación de codo","ubicacionTecnica":"Chiller Vapor","tiposAndamio":["Plataforma trabajo"],"itemEspecialCaldera":"NINGUNO","regimenHorarioEstimado":"HABILES","dimSolicitadaAndamio":{"ancho":1.1,"largo":2,"alto":3,"volumenM3":6.6},"dimSolicitadaPlataforma":{"nPlat":0,"ancho":0,"largo":0,"superficieM2":0},"observaciones":"Deberan coordinar con sala de control","fotoReferencia":"","proveedorAsignado":"Andamios del Sur S.A.","fechaProgramada":"2026-11-19","prioridad":"NORMAL","indicacionesGestionador":"","acuseReciboEjecutante":null,"dimensionesRealesAndamio":[{"ancho":2.5,"largo":3.5,"alto":4,"volumenM3":35}],"dimensionesRealesPlataforma":[{"nPlat":2,"ancho":2.5,"largo":3.5,"superficieM2":17.5}],"totalVolumenRealM3":35,"totalSuperficieRealM2":17.5,"regimenHorarioReal":"HABILES","checklistHabilitacion":{"punto_1":"SI","punto_2":"SI","punto_3":"SI","punto_4":"SI","punto_5":"SI","punto_6":"SI","punto_7":"SI","punto_8":"SI","punto_9":"SI","punto_10":"SI","punto_11":"SI"},"nTarjetaFisica":"TARJ-5121","fotoAndamioMontado":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==","fotoCartelHabilitacion":"","fotoAndamioDesmontado":"","auditoriaGestionador":null,"fechaCreacion":"2026-11-16T19:03:21.200Z","fechaArmado":"2026-11-16T19:10:49.842Z","fechaLimite30Dias":"2026-12-16T19:10:49.842Z","diasPermanencia":1,"fechaSolicitudDesarme":null,"fechaDesarmado":null,"indicacionesDesarme":"","estadoMaterialDesarme":null,"loteImportacionId":null,"copiadoDeSolicitud":null,"fechaAprobacion":"2026-11-16T19:03:48.642Z","firmaSupervisorAndamista":"Supervisor Andamios del Sur S.A."}'::jsonb)
ON CONFLICT (id) DO NOTHING;
