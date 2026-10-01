-- Archiving is also the exit path for an unfinished draft. It must not require
-- inventing a rent. Published, paused and submitted listings still need one.
ALTER TABLE public.properties
  DROP CONSTRAINT valid_property_values,
  ADD CONSTRAINT valid_property_values CHECK (
    (price_per_month > 0 OR (status IN ('DRAFT', 'ARCHIVED') AND price_per_month = 0))
    AND deposit >= 0
    AND min_duration_months BETWEEN 1 AND 120
    AND max_guests BETWEEN 1 AND 100
    AND bedrooms >= 0 AND bathrooms >= 0
    AND (size IS NULL OR size > 0)
    AND currency = 'RWF'
    AND (latitude IS NULL OR latitude BETWEEN -90 AND 90)
    AND (longitude IS NULL OR longitude BETWEEN -180 AND 180)
  ) NOT VALID;
