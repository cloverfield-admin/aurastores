-- Additional compliance document kinds for non-pharmacy verticals.
ALTER TYPE "document_type" ADD VALUE IF NOT EXISTS 'business_registration';
ALTER TYPE "document_type" ADD VALUE IF NOT EXISTS 'trade_license';
