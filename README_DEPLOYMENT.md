# 🚀 Plaet API - Deployment Guide

Este documento proporciona una guía completa para desplegar la API de Plaet en Railway siguiendo las mejores prácticas de arquitectura de software.

## 📋 Tabla de Contenidos

1. [Requisitos](#requisitos)
2. [Configuración Inicial](#configuración-inicial)
3. [Métodos de Despliegue](#métodos-de-despliegue)
4. [Base de Datos](#base-de-datos)
5. [Variables de Entorno](#variables-de-entorno)
6. [Scripts de Despliegue](#scripts-de-despliegue)
7. [Monitorización y Logs](#monitorización-y-logs)
8. [Troubleshooting](#troubleshooting)

## 🚀 Requisitos

### Software Necesario

- Node.js 18+
- npm
- Railway CLI
- Cuenta en Railway (https://railway.app)

### Cuenta Railway

1. Crear cuenta en [Railway](https://railway.app)
2. Obtener el Railway Token desde la configuración del proyecto
3. Agregar el token como secreto en GitHub Actions

## 🔧 Configuración Inicial

### 1. Instalar Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login en Railway

```bash
railway login
# Te redirigirá al navegador para autenticarte
```

### 3. Verificar Configuración

Los siguientes archivos ya están configurados:

- `railway.toml` - Configuración de despliegue para Railway
- `.env.example` - Plantilla de variables de entorno
- `scripts/deploy.sh` - Script de despliegue local
- `.github/workflows/deploy.yml` - GitHub Actions CI/CD

## 🚀 Métodos de Despliegue

### Método 1: Railway CLI (Recomendado)

```bash
# Usar el script de despliegue
./scripts/deploy.sh
```

### Método 2: GitHub Actions (Automático)

```bash
# Hacer push a las ramas main/develop/production
git push origin main
```

### Método 3: Railway Dashboard (Manual)

1. Subir código al repositorio
2. Crear nuevo proyecto en Railway
3. Configurar variables de entorno
4. Deploy desde el dashboard

## 🗄️ Base de Datos

### Opción 1: PostgreSQL de Railway (Recomendado)

- **Ventajas**:

  - Gestionado automáticamente
  - Backups automáticos
  - Escalado automático
  - Sin configuración de servidor
  - Integrado con el ecosistema de Railway

- **Configuración**:

```bash
# Railway proporciona automáticamente DATABASE_URL
# No necesitas configurar nada adicional
```

### Opción 2: Base de Datos Externa

Si prefieres usar tu propia base de datos PostgreSQL:

#### 1. AWS RDS

```bash
# Variables en Railway
DATABASE_URL=postgresql://username:password@your-rds-instance.rds.amazonaws.com:5432/database
```

#### 2. Azure Database

```bash
DATABASE_URL=postgresql://username:password@your-server.postgres.database.azure.com:5432/database
```

#### 3. Otros Proveedores

Asegúrate de que tu base de datos permita conexiones externas.

## 🔐 Variables de Entorno

### Variables Esenciales para Producción

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=tu-secreto-jwt-muy-seguro-32-caracteres
SALT_ROUNDS=10
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_ACCESS_EXPIRATION_DAYS=7
ALLOWED_ORIGINS=https://tu-app.railway.app,https://www.plaet.cloud,https://plaet.cloud
```

### Variables Proporcionadas por Railway

Railway inyecta automáticamente:

- `RAILWAY_PUBLIC_DOMAIN`: URL pública de tu app
- `RAILWAY_SERVICE_NAME`: Nombre del servicio
- `postgresql.DATABASE_URL`: Connection string PostgreSQL
- `RAILWAY_PROJECT_NAME`: Nombre del proyecto

## 📜 Scripts de Despliegue

### Script Local: `scripts/deploy.sh`

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### GitHub Actions: `.github/workflows/deploy.yml`

El workflow se activa automáticamente cuando se hace push a:

- `main`
- `develop`
- `production`

## 🔍 Comandos Principales

### Despliegue Local

```bash
# Login y despliegue
railway login
./scripts/deploy.sh
```

### Configuración de Base de Datos Producción

```bash
# Automático con Railway
./scripts/production-database-setup.js
```

### Verificación de Salud

```bash
# El script incluye verificación automática
curl https://tu-app.railway.app/api/health
```

## 📊 Monitorización y Logs

### Logs de Railway

```bash
# Ver logs en tiempo real
railway logs

# Ver logs de un servicio específico
railway logs plaet-api

# Seguir logs
railway logs -f plaet-api
```

### Health Checks

La API incluye endpoints de salud:

- `/api/health` - Verificación básica del servicio
- `/api/v1/docs` - Documentación Swagger

## 🐛 Troubleshooting

### Problemas Comunes

#### 1. Error de Base de Datos

```bash
# Verificar conexión
railway logs plaet-api

# Reiniciar servicio
railway restart plaet-api
```

#### 2. Variables de Entorno

```bash
# Verificar configuración
railway variables

# Setear variables manualmente
railway variables set PLAET_API JWT_SECRET tu-secreto
```

#### 3. Errores de Despliegue

```bash
# Obtener logs detallados
railway logs plaet-api --since 10m

# Verificar estado del servicio
railway status
```

## 📋 Checklist Pre-Despliegue

### ✅ Código

- [ ] Tests actualizados y pasando
- [ ] Build exitoso sin errores
- [ ] Variables de entorno configuradas
- [ ] Scripts de despliegue creados

### ✅ Railway

- [ ] Cuenta creada y configurada
- [ ] CLI instalado
- [ ] Token obtenido y configurado en GitHub
- [ ] Dominio personalizado (opcional)

### ✅ Base de Datos

- [ ] PostgreSQL seleccionado
- [ ] Connection string configurada
- [ ] Migrations aplicadas
- [ ] Datos iniciales configurados

### ✅ Seguridad

- [ ] JWT secrets configurados
- [ ] HTTPS forzado
- [ ] CORS configurado correctamente
- [ ] Variables sensibles ocultas

## 🚀 Comandos Rápidos de Referencia

```bash
# Despliegue completo
./scripts/deploy.sh && echo "✅ Deployment completed!"

# Solo configuración
railway up --detach

# Verificar estado
railway status

# Ver logs
railway logs plaet-api --tail 20

# Health check
curl https://tu-app.railway.app/api/health

# Build local
npm run build
```

## 📈 Recursos Adicionales

### Documentación

- Swagger UI: `https://tu-app.railway.app/api/v1/docs`
- API Root: `https://tu-app.railway.app/api/v1`
- Health Check: `https://tu-app.railway.app/api/health`

### Monitoreo

Considerar integrar con:

- Railway monitoring (si está disponible en tu plan)
- Sentry para error tracking
- Custom dashboard (si es necesario)

---

## 🎯 Soporte

Para cualquier duda o problema durante el despliegue:

1. Revisar este documento
2. Verificar logs de Railway con `railway logs`
3. Consultar documentación oficial de Railway
4. Revisar logs de GitHub Actions en el repositorio

**¡Tu API está lista para producción en Railway! 🚀**
