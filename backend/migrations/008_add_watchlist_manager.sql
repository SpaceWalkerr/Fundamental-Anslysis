-- Migration 008: Watchlist Manager System
-- Description: Add tables for watchlists, watchlist items, and price targets
-- Date: 2026-02-20

-- ============================================================================
-- DROP EXISTING TABLES (if any from failed migrations)
-- ============================================================================
-- Drop in reverse order due to foreign key constraints
DROP TABLE IF EXISTS watchlist_snapshots CASCADE;
DROP TABLE IF EXISTS watchlist_items CASCADE;
DROP TABLE IF EXISTS watchlists CASCADE;

-- Drop the view if it exists
DROP VIEW IF EXISTS watchlist_summary CASCADE;

-- ============================================================================
-- WATCHLISTS TABLE
-- ============================================================================
-- User-created watchlists for tracking stocks of interest
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    color VARCHAR(20), -- For UI color coding
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_watchlist_name_per_user UNIQUE (user_id, name)
);

CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX idx_watchlists_default ON watchlists(user_id, is_default) WHERE is_default = true;
CREATE INDEX idx_watchlists_sort ON watchlists(user_id, sort_order);

COMMENT ON TABLE watchlists IS 'User-created watchlists for tracking stocks';
COMMENT ON COLUMN watchlists.color IS 'Hex color code for UI display (e.g., #3b82f6)';
COMMENT ON COLUMN watchlists.sort_order IS 'User-defined order for displaying watchlists';

-- ============================================================================
-- WATCHLIST ITEMS TABLE
-- ============================================================================
-- Stocks added to watchlists with price targets and notes
CREATE TABLE watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    company_name VARCHAR(500),
    added_price DECIMAL(20, 4), -- Price when added to watchlist
    target_price DECIMAL(20, 4), -- User's price target
    target_price_type VARCHAR(10) CHECK (target_price_type IN ('BUY', 'SELL', 'ALERT')),
    notes TEXT,
    tags VARCHAR(50)[], -- Array of tags for filtering
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_item_per_watchlist UNIQUE (watchlist_id, ticker)
);

CREATE INDEX idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id);
CREATE INDEX idx_watchlist_items_ticker ON watchlist_items(ticker);
CREATE INDEX idx_watchlist_items_tags ON watchlist_items USING GIN(tags);

COMMENT ON TABLE watchlist_items IS 'Stocks within watchlists with targets and notes';
COMMENT ON COLUMN watchlist_items.added_price IS 'Stock price when added to watchlist';
COMMENT ON COLUMN watchlist_items.target_price IS 'User-defined price target';
COMMENT ON COLUMN watchlist_items.target_price_type IS 'Type of target: BUY, SELL, or ALERT';
COMMENT ON COLUMN watchlist_items.tags IS 'User-defined tags for categorization';

-- ============================================================================
-- WATCHLIST SNAPSHOTS TABLE
-- ============================================================================
-- Historical snapshots of watchlist performance
CREATE TABLE watchlist_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_value DECIMAL(20, 4) NOT NULL,
    avg_change_pct DECIMAL(10, 4),
    num_items INTEGER NOT NULL,
    snapshot_data JSONB, -- Detailed data: {ticker: {price, change, etc}}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_watchlist_snapshot_per_day UNIQUE (watchlist_id, snapshot_date)
);

CREATE INDEX idx_watchlist_snapshots_watchlist_id ON watchlist_snapshots(watchlist_id);
CREATE INDEX idx_watchlist_snapshots_date ON watchlist_snapshots(snapshot_date DESC);

COMMENT ON TABLE watchlist_snapshots IS 'Daily snapshots of watchlist performance';
COMMENT ON COLUMN watchlist_snapshots.snapshot_data IS 'JSONB with detailed stock data at snapshot time';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_snapshots ENABLE ROW LEVEL SECURITY;

-- Watchlists policies
CREATE POLICY "Users can view their own watchlists"
    ON watchlists FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own watchlists"
    ON watchlists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlists"
    ON watchlists FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlists"
    ON watchlists FOR DELETE
    USING (auth.uid() = user_id);

-- Watchlist items policies
CREATE POLICY "Users can view items in their watchlists"
    ON watchlist_items FOR SELECT
    USING (watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid()));

CREATE POLICY "Users can create items in their watchlists"
    ON watchlist_items FOR INSERT
    WITH CHECK (watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid()));

CREATE POLICY "Users can update items in their watchlists"
    ON watchlist_items FOR UPDATE
    USING (watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete items in their watchlists"
    ON watchlist_items FOR DELETE
    USING (watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid()));

-- Watchlist snapshots policies
CREATE POLICY "Users can view snapshots of their watchlists"
    ON watchlist_snapshots FOR SELECT
    USING (watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid()));

CREATE POLICY "Users can create snapshots of their watchlists"
    ON watchlist_snapshots FOR INSERT
    WITH CHECK (watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid()));

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_watchlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_watchlists_timestamp ON watchlists;
CREATE TRIGGER update_watchlists_timestamp
    BEFORE UPDATE ON watchlists
    FOR EACH ROW
    EXECUTE FUNCTION update_watchlist_updated_at();

DROP TRIGGER IF EXISTS update_watchlist_items_timestamp ON watchlist_items;
CREATE TRIGGER update_watchlist_items_timestamp
    BEFORE UPDATE ON watchlist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_watchlist_updated_at();

-- Function: Ensure only one default watchlist per user
CREATE OR REPLACE FUNCTION ensure_single_default_watchlist()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Unset any existing default watchlists for this user
        UPDATE watchlists
        SET is_default = false
        WHERE user_id = NEW.user_id
          AND id != NEW.id
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_single_default_watchlist ON watchlists;
CREATE TRIGGER enforce_single_default_watchlist
    BEFORE INSERT OR UPDATE ON watchlists
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION ensure_single_default_watchlist();

-- Function: Auto-create default watchlist for new users
CREATE OR REPLACE FUNCTION create_default_watchlist()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a default "My Watchlist" for new users
    INSERT INTO watchlists (user_id, name, description, is_default, color)
    VALUES (
        NEW.id,
        'My Watchlist',
        'Default watchlist for tracking stocks',
        true,
        '#3b82f6'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default watchlist on user registration
DROP TRIGGER IF EXISTS create_default_watchlist_on_user_creation ON auth.users;
CREATE TRIGGER create_default_watchlist_on_user_creation
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_watchlist();

-- Function: Update item count when items are added/removed
CREATE OR REPLACE FUNCTION update_watchlist_item_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the watchlist's updated_at timestamp
    UPDATE watchlists
    SET updated_at = NOW()
    WHERE id = COALESCE(NEW.watchlist_id, OLD.watchlist_id);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_watchlist_on_item_change ON watchlist_items;
CREATE TRIGGER update_watchlist_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON watchlist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_watchlist_item_count();

-- Function: Capture added price when item is added
CREATE OR REPLACE FUNCTION set_added_price()
RETURNS TRIGGER AS $$
BEGIN
    -- If added_price is not set, try to fetch current price
    IF NEW.added_price IS NULL THEN
        -- In real implementation, you'd fetch from market data
        -- For now, set to NULL and let application handle it
        NEW.added_price = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_added_price_on_insert ON watchlist_items;
CREATE TRIGGER set_added_price_on_insert
    BEFORE INSERT ON watchlist_items
    FOR EACH ROW
    EXECUTE FUNCTION set_added_price();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Watchlist summary with item counts
CREATE OR REPLACE VIEW watchlist_summary AS
SELECT 
    w.id,
    w.user_id,
    w.name,
    w.description,
    w.is_default,
    w.color,
    w.sort_order,
    w.created_at,
    w.updated_at,
    COUNT(wi.id) as item_count
FROM watchlists w
LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
GROUP BY w.id;

COMMENT ON VIEW watchlist_summary IS 'Watchlists with item counts';

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Note: Default watchlist will be created automatically for each user via trigger

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
    -- Check if tables exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'watchlists') THEN
        RAISE EXCEPTION 'Migration failed: watchlists table not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'watchlist_items') THEN
        RAISE EXCEPTION 'Migration failed: watchlist_items table not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'watchlist_snapshots') THEN
        RAISE EXCEPTION 'Migration failed: watchlist_snapshots table not created';
    END IF;
    
    RAISE NOTICE 'Migration 008 completed successfully!';
    RAISE NOTICE 'Created tables: watchlists, watchlist_items, watchlist_snapshots';
    RAISE NOTICE 'Created view: watchlist_summary';
    RAISE NOTICE 'Created indexes, RLS policies, triggers, and functions';
    RAISE NOTICE 'Default watchlist will be auto-created for new users';
END $$;
