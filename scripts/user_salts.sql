/**
 * User Salts Table Schema
 * 
 * This script creates the user_salts table for zkLogin functionality.
 * The table stores unique salt values for each user's zkLogin authentication.
 * 
 * Features:
 * - Unique salt per user
 * - Automatic timestamp management
 * - Row Level Security (RLS) policies
 * - Indexes for performance optimization
 */

-- Create user_salts table
CREATE TABLE IF NOT EXISTS user_salts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),  -- Unique identifier for each salt record
  user_id uuid REFERENCES auth.users(id) NOT NULL, -- Reference to auth.users table
  salt text NOT NULL,                              -- Unique salt value for zkLogin
  created_at timestamptz DEFAULT now(),            -- Record creation timestamp
  updated_at timestamptz DEFAULT now()             -- Record last update timestamp
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_salts_user_id ON user_salts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_salts_created_at ON user_salts(created_at);

-- Enable Row Level Security
ALTER TABLE user_salts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own salts"
  ON user_salts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own salts"
  ON user_salts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_salts_updated_at
  BEFORE UPDATE ON user_salts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();