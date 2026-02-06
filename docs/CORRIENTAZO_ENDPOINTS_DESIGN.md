# API Endpoints Design - Sistema de Corrientazo

## Visión General

Este documento define los endpoints necesarios para soportar el flujo de pedidos de corrientazo/almuerzo implementado en el frontend.

## Endpoints Requeridos

### 1. Daily Menu (Menú del Día)

**Base Path:** `/api/v1/daily-menu`

#### GET /daily-menu
Obtiene el menú del día actual.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "date": "2026-02-03",
    "principio": "Frijoles con plátano maduro",
    "sopa": "Sopa de verduras",
    "jugo": "Limonada natural",
    "postre": "Gelatina",
    "isActive": true,
    "createdAt": "2026-02-03T06:00:00Z",
    "updatedAt": "2026-02-03T06:00:00Z"
  }
}
```

#### PUT /daily-menu
Actualiza el menú del día (Admin only).

**Request Body:**
```json
{
  "principio": "Frijoles con plátano maduro",
  "sopa": "Sopa de verduras",
  "jugo": "Limonada natural",
  "postre": "Gelatina"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Daily menu updated successfully",
  "data": { ... }
}
```

---

### 2. Proteins (Proteínas)

**Base Path:** `/api/v1/proteins`

#### GET /proteins
Obtiene todas las proteínas disponibles para el corrientazo.

**Query Parameters:**
- `isAvailable` (boolean): Filtrar por disponibilidad

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Carne a la plancha",
      "price": 10000,
      "icon": "beef",
      "isAvailable": true,
      "categoryId": 5,
      "category": {
        "id": 5,
        "name": "Proteínas"
      }
    }
  ]
}
```

**Nota:** Las proteínas son items del menú con categoría específica. Se puede implementar como:
- Opción A: Nuevo endpoint `/proteins`
- Opción B: Usar `/items?category=proteins&isExtra=false`

---

### 3. Plate Components (Componentes del Plato)

**Base Path:** `/api/v1/plate-components`

#### GET /plate-components
Obtiene componentes disponibles para sustituciones y adicionales.

**Query Parameters:**
- `type` (enum): "sopa" | "principio" | "ensalada" | "adicional"
- `hasCost` (boolean): true = adicionales con costo, false = sustituciones sin costo

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "name": "Porción de principio",
      "type": "principio",
      "price": 0,
      "isAvailable": true
    },
    {
      "id": 201,
      "name": "Huevo",
      "type": "adicional",
      "price": 2000,
      "isAvailable": true
    }
  ]
}
```

---

### 4. Orders (Modificación)

El endpoint POST /orders ya existe, pero necesitamos verificar que soporte:

**Request Body Actual:**
```json
{
  "type": "DINE_IN" | "TAKE_OUT" | "DELIVERY" | "WHATSAPP",
  "tableId": 5,
  "items": [
    {
      "menuItemId": 1,
      "quantity": 1,
      "notes": "Almuerzo con Carne a la plancha - Sin sal"
    }
  ],
  "notes": "Notas generales del pedido"
}
```

**Verificaciones:**
- [ ] El precio se captura automáticamente del menuItem
- [ ] Soporta múltiples items por orden
- [ ] Las notas se guardan correctamente
- [ ] Stock se decrementa automáticamente

---

## Modelos de Datos (Prisma)

### DailyMenu Model
```prisma
model DailyMenu {
  id        String   @id @default(uuid())
  date      DateTime @unique @db.Date
  principio String
  sopa      String
  jugo      String
  postre    String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Modificaciones a MenuItem
```prisma
model MenuItem {
  // ... campos existentes ...
  
  // Nuevos campos para corrientazo
  isProtein   Boolean  @default(false)
  proteinIcon String?  // "beef" | "fish" | "chicken" | "pork" | "other"
  
  // Para componentes del plato
  isPlateComponent Boolean  @default(false)
  componentType    String?  // "sopa" | "principio" | "ensalada" | "adicional"
  
  // Precio especial para corrientazo (si aplica)
  comboPrice Decimal? @db.Decimal(10, 2)
}
```

---

## Flujo de Trabajo Git

### Ramas Principales
- `main` - Producción estable
- `develop` - Desarrollo activo

### Ramas de Features
- `feature/api/daily-menu-endpoints`
- `feature/api/proteins-endpoints`
- `feature/api/plate-components-endpoints`
- `feature/api/order-enhancements`

### Tags (Versionado Semántico)
- `v1.5.0` - Release con endpoints de corrientazo
- `v1.5.1` - Hotfixes si son necesarios

---

## Testing

### Tests Unitarios
- Repository tests
- Service tests
- Controller tests

### Tests de Integración
- Flujo completo de creación de orden
- Actualización de menú del día
- Disponibilidad de proteínas

### Tests E2E
- Crear pedido completo de corrientazo
- Editar pedido existente
- Cancelar pedido y restaurar stock

---

## Documentación Swagger

Cada endpoint debe incluir:
- Descripción clara
- Parámetros con ejemplos
- Request/Response schemas
- Códigos de error posibles

## Checklist de Implementación

- [ ] Crear modelo DailyMenu en Prisma
- [ ] Crear migración de base de datos
- [ ] Implementar DailyMenuRepository
- [ ] Implementar DailyMenuService
- [ ] Implementar DailyMenuController
- [ ] Crear rutas para DailyMenu
- [ ] Implementar validaciones (Zod)
- [ ] Agregar tests unitarios
- [ ] Agregar tests de integración
- [ ] Documentar en Swagger
- [ ] Revisar endpoint existente POST /orders
- [ ] Actualizar frontend con URLs correctas
- [ ] Crear seed data para menú del día
- [ ] Testing en ambiente de desarrollo
