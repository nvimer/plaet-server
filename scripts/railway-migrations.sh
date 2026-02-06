# Railway Production Database Fix
# Script para ejecutar migrations manuales en Railway

echo "🚀 RUNNING DATABASE MIGRATIONS IN PRODUCTION"
echo ""

echo "📋 PASO 1: Generando Prisma Client..."
npx prisma generate

echo ""
echo "📋 PASO 2: Ejecutando Migrations de Producción..."
npx prisma migrate deploy

echo ""
echo "✅ DATABASE MIGRATIONS COMPLETADAS"
echo "📊 Tablas de la base de datos creadas"
echo ""
echo "🌐 Tu Plaet API debería iniciarse correctamente ahora"