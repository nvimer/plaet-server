-- ============================
-- CARGA INICIAL DEL MENÚ — Sazonarte
-- ============================
-- Restaurante: 8a782271-1f51-4b7a-a1f5-f7650ba44d53 (Sazonarte)
--
-- Se puede correr varias veces: el índice único (restaurant_id, category_id, name)
-- evita duplicados; los que ya existan se saltan.
--
-- Los precios son de VENTA SUELTA. El almuerzo no se ve afectado: el corrientazo
-- viaja como un solo ítem (la proteína) con precio = margen base + proteína, y la
-- sopa, el principio, el arroz y el jugo van incluidos sin cobrarse aparte.
--
-- Inventario: solo las proteínas llevan control (TRACKED). Arrancan en 0; cada
-- mañana cargas las porciones del día.
--
-- Al final avisa cuántos insertó. Si algo sale mal, lo dice en vez de quedarse callado.

DO $carga$
DECLARE
  v_restaurante UUID := '8a782271-1f51-4b7a-a1f5-f7650ba44d53';
  v_categorias INTEGER;
  v_previos INTEGER;
  v_insertados INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_categorias FROM menu_categories
   WHERE restaurant_id = v_restaurante AND deleted = false;

  SELECT COUNT(*) INTO v_previos FROM menu_items
   WHERE restaurant_id = v_restaurante AND deleted = false;

  IF v_categorias = 0 THEN
    RAISE EXCEPTION 'SIN CATEGORIAS -> el restaurante % no tiene categorías; corre primero la migración 00003', v_restaurante;
  END IF;

  INSERT INTO menu_items
    (category_id, name, description, price, is_available, inventory_type, stock_quantity,
     low_stock_alert, auto_mark_unavailable, restaurant_id, updated_at)
  SELECT mc.id, d.nombre, d.descripcion, d.precio, true, d.inventario,
         CASE WHEN d.inventario = 'TRACKED' THEN 0 ELSE NULL END,
         CASE WHEN d.inventario = 'TRACKED' THEN 5 ELSE NULL END,
         d.inventario = 'TRACKED',
         v_restaurante, NOW()
  FROM (VALUES

  -- ---------- SOPAS ----------
  ('Sopas', 'Sancocho', 'Sancocho tradicional con plátano, yuca y papa, cocinado a fuego lento.', 5000, 'UNTRACKED'),
  ('Sopas', 'Sopa de plátano', 'Crema suave de plátano verde, espesa y con buen sabor de casa.', 5000, 'UNTRACKED'),
  ('Sopas', 'Sopa de pasta', 'Caldo claro con pasta y verduras picadas.', 5000, 'UNTRACKED'),
  ('Sopas', 'Sopa de quinua', 'Quinua cocinada con verduras, suave y nutritiva.', 5000, 'UNTRACKED'),
  ('Sopas', 'Sopa de verduras', 'Verduras frescas del día en caldo casero.', 5000, 'UNTRACKED'),
  ('Sopas', 'Locro', 'Locro espeso de papa con queso y cilantro.', 5000, 'UNTRACKED'),
  ('Sopas', 'Sopa de maíz', 'Maíz tierno cocinado despacio hasta soltar todo su dulce.', 5000, 'UNTRACKED'),
  ('Sopas', 'Sopa de avena', 'Avena cremosa, suave para el estómago.', 5000, 'UNTRACKED'),
  ('Sopas', 'Consomé', 'Caldo claro de pollo con verduras y cilantro fresco.', 5000, 'UNTRACKED'),
  ('Sopas', 'Sopa de cebada', 'Cebada cocinada con verduras y hierbas de la casa.', 5000, 'UNTRACKED'),
  ('Sopas', 'Sopa de cebada perlada', 'Cebada perlada, más suave y cremosa que la tradicional.', 5000, 'UNTRACKED'),

  -- ---------- PROTEÍNAS ----------
  ('Proteínas', 'Chuleta de cerdo', 'Chuleta de cerdo apanada, crocante por fuera y jugosa por dentro.', 6000, 'TRACKED'),
  ('Proteínas', 'Chuleta de pollo', 'Chuleta de pollo apanada, dorada al momento.', 6000, 'TRACKED'),
  ('Proteínas', 'Pechuga a la plancha', 'Pechuga de pollo a la plancha, sazonada con hierbas.', 6000, 'TRACKED'),
  ('Proteínas', 'Pollo frito', 'Presa de pollo frita, crocante y bien sazonada.', 6000, 'TRACKED'),
  ('Proteínas', 'Carne de cerdo a la plancha', 'Carne de cerdo a la plancha, en su punto.', 6000, 'TRACKED'),
  ('Proteínas', 'Carne de res a la plancha', 'Carne de res a la plancha, jugosa y bien condimentada.', 6000, 'TRACKED'),
  ('Proteínas', 'Pollo en salsa BBQ de la casa', 'Pollo bañado en nuestra salsa BBQ, dulce y ahumada.', 6000, 'TRACKED'),
  ('Proteínas', 'Pescado frito', 'Filete de pescado frito, crocante y fresco.', 7000, 'TRACKED'),

  -- ---------- PRINCIPIOS ----------
  ('Principios', 'Frijoles', 'Frijoles guisados con el sofrito de la casa.', 3000, 'UNTRACKED'),
  ('Principios', 'Lentejas', 'Lentejas cocinadas despacio con verduras.', 3000, 'UNTRACKED'),
  ('Principios', 'Arveja', 'Arveja guisada, suave y con buen sabor.', 3000, 'UNTRACKED'),
  ('Principios', 'Garbanzo', 'Garbanzo guisado al estilo casero.', 3000, 'UNTRACKED'),
  ('Principios', 'Garbanzo en salsa de maní', 'Garbanzo en salsa de maní, cremoso y con sabor propio.', 3000, 'UNTRACKED'),
  ('Principios', 'Frijol blanco', 'Frijol blanco guisado con hierbas frescas.', 3000, 'UNTRACKED'),
  ('Principios', 'Papas con maní', 'Papas en salsa de maní, un clásico de la casa.', 3000, 'UNTRACKED'),
  ('Principios', 'Verduras', 'Verduras salteadas del día.', 3000, 'UNTRACKED'),
  ('Principios', 'Espaguetis', 'Espaguetis en salsa de la casa.', 3000, 'UNTRACKED'),

  -- ---------- ARROCES ---------- (propuesta: el menú del día tiene ranura de arroz)
  ('Arroces', 'Arroz blanco', 'Arroz blanco suelto, el de siempre.', 3000, 'UNTRACKED'),
  ('Arroces', 'Arroz con fideos', 'Arroz con fideos dorados.', 3000, 'UNTRACKED'),
  ('Arroces', 'Arroz con verduras', 'Arroz salteado con verduras picadas.', 3000, 'UNTRACKED'),

  -- ---------- ENSALADAS ---------- (propuesta)
  ('Ensaladas', 'Ensalada fresca', 'Lechuga, tomate y cebolla con limón.', 2000, 'UNTRACKED'),
  ('Ensaladas', 'Ensalada de remolacha y zanahoria', 'Remolacha y zanahoria ralladas, frescas y dulces.', 2000, 'UNTRACKED'),
  ('Ensaladas', 'Ensalada de repollo', 'Repollo con zanahoria y aderezo casero.', 2000, 'UNTRACKED'),
  ('Ensaladas', 'Ensalada rusa', 'Papa, zanahoria y arveja con nuestro aderezo.', 2000, 'UNTRACKED'),
  ('Ensaladas', 'Ensalada de pepino y tomate', 'Pepino y tomate en rodajas, ligera y refrescante.', 2000, 'UNTRACKED'),
  ('Ensaladas', 'Ensalada dulce', 'Repollo con manzana y pasas, suave y dulce.', 2000, 'UNTRACKED'),

  -- ---------- BEBIDAS: jugos naturales (incluidos en el almuerzo) ----------
  ('Bebidas', 'Jugo de tomate de árbol', 'Jugo natural de tomate de árbol, hecho al momento.', 2000, 'UNTRACKED'),
  ('Bebidas', 'Jugo de guayaba', 'Jugo natural de guayaba.', 2000, 'UNTRACKED'),
  ('Bebidas', 'Jugo de lulo', 'Jugo natural de lulo, ácido y refrescante.', 2000, 'UNTRACKED'),
  ('Bebidas', 'Jugo de piña', 'Jugo natural de piña.', 2000, 'UNTRACKED'),
  ('Bebidas', 'Jugo de tamarindo', 'Jugo natural de tamarindo, dulce y ácido a la vez.', 2000, 'UNTRACKED'),
  ('Bebidas', 'Limonada', 'Limonada natural bien fría.', 2000, 'UNTRACKED'),
  ('Bebidas', 'Agua de panela', 'Agua de panela con limón, caliente o fría.', 2000, 'UNTRACKED'),

  -- ---------- BEBIDAS: envasadas ----------
  ('Bebidas', 'Agua', 'Botella de agua.', 2000, 'UNTRACKED'),
  ('Bebidas', 'Jugo Hit', 'Jugo Hit en botella.', 2500, 'UNTRACKED'),
  ('Bebidas', 'Gaseosa pequeña', 'Gaseosa en presentación pequeña.', 1500, 'UNTRACKED'),
  ('Bebidas', 'Gaseosa personal', 'Gaseosa en presentación personal.', 3000, 'UNTRACKED'),
  ('Bebidas', 'Gaseosa 1.5 litros', 'Gaseosa de litro y medio, para compartir.', 7000, 'UNTRACKED'),
  ('Bebidas', 'Gaseosa grande', 'Gaseosa familiar.', 10000, 'UNTRACKED'),

  -- ---------- EXTRAS ----------
  ('Extras', 'Papas fritas', 'Porción de papas fritas.', 3000, 'UNTRACKED'),
  ('Extras', 'Patacones', 'Porción de patacones crocantes.', 3000, 'UNTRACKED'),
  ('Extras', 'Huevo frito', 'Huevo frito para acompañar.', 1500, 'UNTRACKED'),
  ('Extras', 'Tajada de aguacate', 'Tajada de aguacate fresco.', 2000, 'UNTRACKED'),
  ('Extras', 'Aguacate completo', 'Aguacate entero, en tajadas.', 3000, 'UNTRACKED'),
  ('Extras', 'Tajadas de maduro', 'Tajadas de plátano maduro.', 3000, 'UNTRACKED'),
  ('Extras', 'Porción de arroz', 'Porción adicional de arroz.', 3000, 'UNTRACKED'),
  ('Extras', 'Porción de proteína', 'Porción adicional de la proteína del día.', 6000, 'UNTRACKED')
  ) AS d(categoria, nombre, descripcion, precio, inventario)
  JOIN menu_categories mc
    ON mc.restaurant_id = v_restaurante
   AND mc.deleted = false
   AND translate(lower(mc.name), 'áéíóúüñ', 'aeiouun') = translate(lower(d.categoria), 'áéíóúüñ', 'aeiouun')
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_insertados = ROW_COUNT;

  IF v_insertados = 0 THEN
    RAISE EXCEPTION 'NADA INSERTADO -> categorias=%, productos_previos=%. Si productos_previos ya es 58, estaban cargados; si es 0, los nombres de tus categorías no coinciden.', v_categorias, v_previos;
  END IF;

  RAISE NOTICE 'Insertados % productos (antes había %)', v_insertados, v_previos;
END
$carga$;

-- Resumen: cuántos productos quedaron por categoría.
-- (Sin mc.type a propósito: esa columna llega con la migración 00004.)
SELECT mc.name AS categoria, COUNT(mi.id) AS productos
FROM menu_categories mc
LEFT JOIN menu_items mi ON mi.category_id = mc.id AND mi.deleted = false
WHERE mc.restaurant_id = '8a782271-1f51-4b7a-a1f5-f7650ba44d53' AND mc.deleted = false
GROUP BY mc.name, mc."order"
ORDER BY mc."order";
