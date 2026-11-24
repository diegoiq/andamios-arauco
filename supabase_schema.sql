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
-- DATOS INICIALES BASE (SIN DATOS DE PRUEBA)
-- ========================================================

INSERT INTO usuarios (id, nombre, email, password, rol, perfil_tipo, sector, legajo, centro_costos, empresa_nombre, recuperacion)
VALUES ('USR-ADM-00', 'Diego A. Cristaldo (Admin ARAUCO)', 'diego.a.cristaldo@arauco.com', 'Arauco!2026', 'GESTIONADOR', '', 'Administración General de Andamios y Paradas', '50100', 'CC-SUP-00', '', NULL)
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password, rol = EXCLUDED.rol;

INSERT INTO usuarios (id, nombre, email, password, rol, perfil_tipo, sector, legajo, centro_costos, empresa_nombre, recuperacion)
VALUES ('USR-ADM-DIEGO2026', 'Diego2026', 'diego2026@arauco.com', 'scrypt$ba9ee47c225650c943c29c37f729d86e$ac541e78f8ec665a048552eb4ab226aef7b0a9162976080150991c65322a22868ea74e92a248af8e423e1ca9f1d7bcdd6c8113295999b3fdbf536c702e9847fd', 'GESTIONADOR', '', 'Administración General de Andamios y Paradas', 'ADM-2026', 'CC-SUP-00', '', NULL)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, email = EXCLUDED.email, password = EXCLUDED.password, rol = EXCLUDED.rol;

INSERT INTO configuracion (clave, valor)
VALUES ('tarifarios', '{"items18":[{"id":1,"codigo":"CF-MTTO","nombre":"Canon Fijo Mantenimiento","unidad":"Global/Mes","valor":450000,"cantidadMes":1},{"id":2,"codigo":"CF-PROD","nombre":"Canon Fijo Producción","unidad":"Global/Mes","valor":380000,"cantidadMes":1},{"id":3,"codigo":"AND-HAB","nombre":"Andamios Nuevos (días hábiles)","unidad":"m³","valor":1250},{"id":4,"codigo":"AND-SAB-NOC","nombre":"Andamios Nuevos Sábados y Nocturno","unidad":"m³","valor":1650},{"id":5,"codigo":"AND-DOM-FER","nombre":"Andamios Nuevos Domingo y Feriado","unidad":"m³","valor":2100},{"id":6,"codigo":"AND-ALQ","nombre":"Andamios Alquilados (>30 días)","unidad":"m³","valor":650},{"id":7,"codigo":"PLAT-HAB","nombre":"Plataformas (días hábiles)","unidad":"m²","valor":950},{"id":8,"codigo":"PLAT-SAB-NOC","nombre":"Plataformas Sábados y Nocturno","unidad":"m²","valor":1280},{"id":9,"codigo":"PLAT-DOM-FER","nombre":"Plataformas Nuevos Domingo y Feriado","unidad":"m²","valor":1600},{"id":10,"codigo":"PLAT-ALQ","nombre":"Plataformas (alquilados)","unidad":"m²","valor":480},{"id":11,"codigo":"EST-HAB","nombre":"Estructuras (días hábiles)","unidad":"m³","valor":1100},{"id":12,"codigo":"EST-SAB-NOC","nombre":"Estructuras Nuevos Sábados y Nocturno","unidad":"m³","valor":1450},{"id":13,"codigo":"EST-DOM-FER","nombre":"Estructuras Nuevos Domingo y Feriado","unidad":"m³","valor":1900},{"id":14,"codigo":"EST-ALQ","nombre":"Estructuras (alquilados)","unidad":"m³","valor":550},{"id":15,"codigo":"PISO-INF-CR","nombre":"Pisos de seguridad INF CR","unidad":"Unid/m²","valor":85000},{"id":16,"codigo":"PISO-SUP-CR","nombre":"Pisos de seguridad SUP CR","unidad":"Unid/m²","valor":95000},{"id":17,"codigo":"PISO-CP","nombre":"Pisos de seguridad CP","unidad":"Unid/m²","valor":110000},{"id":18,"codigo":"GRILLA-MOV-CP","nombre":"Entablonado Grilla móvil CP","unidad":"Unid/m²","valor":135000}],"pgp":{"valorM3Andamio":1850,"valorM2Plataforma":1400}}'::jsonb)
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;

INSERT INTO configuracion (clave, valor)
VALUES ('limites_mensuales', '{"cantidadAndamiosMes":50,"limiteM3Mes":1500,"limiteM2Mes":600,"presupuestoMes":0}'::jsonb)
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;

INSERT INTO configuracion (clave, valor)
VALUES ('correlativo', '{"ultimo": 0}'::jsonb)
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;
