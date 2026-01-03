-- Add file upload and URL input labels to form_interfaces
SET search_path TO flowmaestro, public;

-- Add file_upload_label column
ALTER TABLE form_interfaces
ADD COLUMN IF NOT EXISTS file_upload_label VARCHAR(255) DEFAULT 'Attachments';

-- Add url_input_label column
ALTER TABLE form_interfaces
ADD COLUMN IF NOT EXISTS url_input_label VARCHAR(255) DEFAULT 'Web URLs';
