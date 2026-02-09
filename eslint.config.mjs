import tseslint from "@typescript-eslint/eslint-plugin"; // El plugin de ESLint para TypeScript
import tsparser from "@typescript-eslint/parser"; // El parser que permite a ESLint entender TypeScript
import prettierPlugin from "eslint-plugin-prettier"; // El plugin de ESLint para integrar Prettier
import prettierConfig from "eslint-config-prettier"; // La configuración que desactiva reglas de formato de ESLint que chocan con Prettier

export default [
  {
    // --- ignores ---
    // Archivos y directorios que ESLint debe ignorar completamente.
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "scripts/**",
      "prisma/migrations/**",
      "prisma/seed*.ts",
      "src/tests/**",
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.spec.ts",
      "*.log",
      ".env*",
    ],

    // --- files ---
    // Especifica a qué archivos se aplica este bloque de configuración.
    // "**/*.ts" significa "todos los archivos con extensión .ts en cualquier subcarpeta".
    files: ["**/*.ts"],

    // --- languageOptions ---
    // Opciones relacionadas con el lenguaje y cómo ESLint debe parsear el código.
    languageOptions: {
      // Especifica el parser a usar. Usamos "@typescript-eslint/parser" para TypeScript.
      parser: tsparser,
      // Define el tipo de módulo. "module" indica que usamos import/export (módulos ES).
      sourceType: "module",
    },

    // --- plugins ---
    // Registra los plugins que se usarán en este bloque de configuración.
    // Los nombres de las claves ("@typescript-eslint", "prettier") son los prefijos
    // que usarás para referenciar las reglas de esos plugins (ej: "@typescript-eslint/rule-name").
    plugins: {
      "@typescript-eslint": tseslint, // Registra el plugin de TypeScript
      prettier: prettierPlugin, // Registra el plugin de Prettier
    },

    // --- rules ---
    // Define las reglas de linting que se aplicarán a los archivos especificados.
    // Las reglas se definen como clave-valor: "nombre-de-la-regla": "nivel-o-configuración".
    // Niveles comunes: "off" (desactivada), "warn" (advertencia), "error" (error).

    rules: {
      // "Spread" (propagación) de las reglas recomendadas del plugin de TypeScript.
      // Esto aplica un conjunto estándar de buenas prácticas para código TypeScript.
      ...tseslint.configs.recommended.rules,

      // "Spread" (propagación) de las reglas de "eslint-config-prettier".
      // ESTO ES CLAVE para la integración con Prettier. Estas reglas DESACTIVAN
      // todas las reglas de formato de ESLint que son manejadas por Prettier,
      // evitando conflictos y asegurando que Prettier sea la única fuente de verdad para el formato.
      ...prettierConfig.rules,

      // --- Reglas específicas o sobrescritas ---
      // Aquí defines reglas adicionales o sobrescribes las de "recommended".

      // Regla del plugin de TypeScript: advierte sobre variables no usadas.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Regla base de ESLint: advierte sobre el uso de console.log (a menudo no deseado en producción).
      "no-console": "warn",

      // Regla base de ESLint: requiere punto y coma al final de las sentencias.
      // Nivel "error", estilo "always" (siempre).
      semi: ["error", "always"],

      // Regla base de ESLint: requiere comillas dobles para las cadenas.
      // Nivel "error", estilo "double".
      quotes: ["error", "double"],

      // Regla del plugin de Prettier: ejecuta Prettier como una regla de ESLint.
      // Si Prettier detecta que el código no está formateado según su configuración,
      // ESLint reportará un "error" en esa línea. Esto fuerza el formato correcto.
      "prettier/prettier": "error",
    },
  },
  // Podrías añadir más bloques de configuración aquí para otros tipos de archivos
  // o reglas diferentes (ej: archivos de test, archivos JavaScript puros si los hubiera).
];
