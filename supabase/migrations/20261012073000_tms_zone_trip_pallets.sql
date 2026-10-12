-- YARD ON TMS MVP: scoped zone drawing, stores, outbound trips and single-pallet allocation.
-- No existing inbound/WMS records are modified.
CREATE TABLE IF NOT EXISTS public.yardon_tms_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse text NOT NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
  color text NOT NULL DEFAULT '#16c5eb' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  polygon jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (
    jsonb_typeof(polygon)='array' AND jsonb_array_length(polygon) <= 250
    AND (jsonb_array_length(polygon)=0 OR jsonb_array_length(polygon)>=3)
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(warehouse,name),
  UNIQUE(id,warehouse)
);
CREATE TABLE IF NOT EXISTS public.yardon_tms_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse text NOT NULL,
  zone_id uuid NOT NULL,
  code text NOT NULL CHECK (char_length(btrim(code)) BETWEEN 1 AND 40),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  city text NOT NULL DEFAULT '',
  lat double precision CHECK (lat BETWEEN 42 AND 47),
  lng double precision CHECK (lng BETWEEN 13 AND 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(warehouse,code),
  UNIQUE(id,warehouse,zone_id),
  FOREIGN KEY(zone_id,warehouse) REFERENCES public.yardon_tms_zones(id,warehouse) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS public.yardon_tms_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse text NOT NULL,
  zone_id uuid NOT NULL,
  plate text NOT NULL CHECK (char_length(btrim(plate)) BETWEEN 3 AND 32),
  carrier text NOT NULL DEFAULT '',
  capacity_pallets integer NOT NULL DEFAULT 33 CHECK (capacity_pallets BETWEEN 1 AND 66),
  departure_on date NOT NULL DEFAULT CURRENT_DATE,
  dock text,
  status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','loading','loaded','departed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,warehouse,zone_id),
  FOREIGN KEY(zone_id,warehouse) REFERENCES public.yardon_tms_zones(id,warehouse) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS public.yardon_tms_pallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse text NOT NULL,
  zone_id uuid NOT NULL,
  store_id uuid NOT NULL,
  pallet_code text NOT NULL CHECK (char_length(btrim(pallet_code)) BETWEEN 2 AND 80),
  trip_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(warehouse,pallet_code),
  FOREIGN KEY(store_id,warehouse,zone_id) REFERENCES public.yardon_tms_stores(id,warehouse,zone_id) ON DELETE RESTRICT,
  FOREIGN KEY(trip_id,warehouse,zone_id) REFERENCES public.yardon_tms_trips(id,warehouse,zone_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS yardon_tms_stores_zone_idx ON public.yardon_tms_stores(warehouse,zone_id);
CREATE INDEX IF NOT EXISTS yardon_tms_trips_zone_idx ON public.yardon_tms_trips(warehouse,zone_id);
CREATE INDEX IF NOT EXISTS yardon_tms_pallets_store_idx ON public.yardon_tms_pallets(warehouse,store_id);
CREATE INDEX IF NOT EXISTS yardon_tms_pallets_trip_idx ON public.yardon_tms_pallets(trip_id);

-- Serializes competing pallet drops on one truck to prevent over-allocation.
CREATE OR REPLACE FUNCTION public.yardon_tms_guard_pallet_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='public' AS $$
DECLARE cap integer; occupied integer; current_status text;
BEGIN
 IF NEW.trip_id IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.trip_id IS NOT DISTINCT FROM NEW.trip_id THEN RETURN NEW; END IF;
 SELECT capacity_pallets,status INTO cap,current_status
 FROM public.yardon_tms_trips
 WHERE id=NEW.trip_id AND warehouse=NEW.warehouse AND zone_id=NEW.zone_id
 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'TMS_TRIP_NOT_AVAILABLE'; END IF;
 IF current_status NOT IN ('planned','loading') THEN RAISE EXCEPTION 'TMS_TRIP_CLOSED'; END IF;
 SELECT count(*) INTO occupied FROM public.yardon_tms_pallets WHERE trip_id=NEW.trip_id;
 IF occupied>=cap THEN RAISE EXCEPTION 'TMS_TRUCK_FULL'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS yardon_tms_guard_pallet_assignment ON public.yardon_tms_pallets;
CREATE TRIGGER yardon_tms_guard_pallet_assignment
BEFORE INSERT OR UPDATE OF trip_id ON public.yardon_tms_pallets
FOR EACH ROW EXECUTE FUNCTION public.yardon_tms_guard_pallet_assignment();

-- Prevent reducing truck capacity below its current allocations.
CREATE OR REPLACE FUNCTION public.yardon_tms_guard_trip_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='public' AS $$
DECLARE occupied integer;
BEGIN
 IF TG_OP='UPDATE' AND NEW.capacity_pallets < OLD.capacity_pallets THEN
   SELECT count(*) INTO occupied FROM public.yardon_tms_pallets WHERE trip_id=OLD.id;
   IF NEW.capacity_pallets<occupied THEN RAISE EXCEPTION 'TMS_CAPACITY_BELOW_ALLOCATED'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS yardon_tms_guard_trip_capacity ON public.yardon_tms_trips;
CREATE TRIGGER yardon_tms_guard_trip_capacity BEFORE UPDATE OF capacity_pallets
ON public.yardon_tms_trips FOR EACH ROW EXECUTE FUNCTION public.yardon_tms_guard_trip_capacity();

ALTER TABLE public.yardon_tms_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yardon_tms_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yardon_tms_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yardon_tms_pallets ENABLE ROW LEVEL SECURITY;

-- Policies always use the server-owned profile, never editable user metadata.
-- Admin has broad visibility; Dispatcher is limited to assigned warehouses.
DO $policies$
DECLARE tbl text; rule text;
BEGIN
 FOREACH tbl IN ARRAY ARRAY['yardon_tms_zones','yardon_tms_stores','yardon_tms_trips','yardon_tms_pallets'] LOOP
  rule := format('EXISTS (SELECT 1 FROM public.yardivo_user_access a WHERE a.auth_user_id=(SELECT auth.uid()) AND a.active=true AND (a.app_role=''admin'' OR (a.app_role=''dispatcher'' AND %I.warehouse=ANY(a.warehouses))))',tbl);
  EXECUTE format('CREATE POLICY tms_read ON public.%I FOR SELECT TO authenticated USING (%s)',tbl,rule);
  EXECUTE format('CREATE POLICY tms_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',tbl,rule);
  EXECUTE format('CREATE POLICY tms_update ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',tbl,rule,rule);
  EXECUTE format('CREATE POLICY tms_delete ON public.%I FOR DELETE TO authenticated USING (%s)',tbl,rule);
 END LOOP;
END $policies$;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.yardon_tms_zones,public.yardon_tms_stores,public.yardon_tms_trips,public.yardon_tms_pallets TO authenticated;
REVOKE ALL ON public.yardon_tms_zones,public.yardon_tms_stores,public.yardon_tms_trips,public.yardon_tms_pallets FROM anon;
