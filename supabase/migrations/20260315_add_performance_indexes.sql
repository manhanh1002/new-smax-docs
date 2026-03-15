-- Add index on language column for faster filtering
-- This improves performance when filtering documents by language

CREATE INDEX IF NOT EXISTS idx_documents_language ON documents(language);

-- Also add index on document_sections.document_id for faster joins
CREATE INDEX IF NOT EXISTS idx_document_sections_document_id ON document_sections(document_id);
