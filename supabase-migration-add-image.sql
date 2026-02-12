-- Migration: Add image column to vehicles table
-- Run this if your vehicles table already exists without the image column

-- Add image column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicles' 
    AND column_name = 'image'
  ) THEN
    ALTER TABLE public.vehicles ADD COLUMN image text;
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'vehicles' 
  AND column_name = 'image';
