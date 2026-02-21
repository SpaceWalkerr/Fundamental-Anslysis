-- Migration 007: Portfolio Tracking System
-- Description: Add tables for portfolio management, holdings, transactions, and performance tracking
-- Date: 2026-02-20

-- ============================================================================
-- PORTFOLIOS TABLE
-- ============================================================================
-- Stores user portfolios (users can have multiple portfolios)
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    currency VARCHAR(3) DEFAULT 'USD',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_portfolio_name_per_user UNIQUE (user_id, name)
);

CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolios_default ON portfolios(user_id, is_default) WHERE is_default = true;

COMMENT ON TABLE portfolios IS 'User portfolios for tracking stock holdings';
COMMENT ON COLUMN portfolios.is_default IS 'Whether this is the user''s default portfolio';
COMMENT ON COLUMN portfolios.currency IS 'Base currency for portfolio valuation';

-- ============================================================================
-- PORTFOLIO HOLDINGS TABLE
-- ============================================================================
-- Current holdings in each portfolio (aggregated view)
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    company_name VARCHAR(500),
    quantity DECIMAL(20, 8) NOT NULL CHECK (quantity >= 0),
    avg_cost_basis DECIMAL(20, 4) NOT NULL CHECK (avg_cost_basis >= 0),
    total_cost DECIMAL(20, 4) GENERATED ALWAYS AS (quantity * avg_cost_basis) STORED,
    first_purchase_date TIMESTAMP WITH TIME ZONE,
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_holding_per_portfolio UNIQUE (portfolio_id, ticker)
);

CREATE INDEX idx_holdings_portfolio_id ON portfolio_holdings(portfolio_id);
CREATE INDEX idx_holdings_ticker ON portfolio_holdings(ticker);

COMMENT ON TABLE portfolio_holdings IS 'Current stock holdings in portfolios (aggregated from transactions)';
COMMENT ON COLUMN portfolio_holdings.avg_cost_basis IS 'Average cost per share (calculated from transactions)';
COMMENT ON COLUMN portfolio_holdings.total_cost IS 'Total invested amount (quantity * avg_cost_basis)';

-- ============================================================================
-- PORTFOLIO TRANSACTIONS TABLE
-- ============================================================================
-- All buy/sell transactions for portfolio holdings
CREATE TABLE IF NOT EXISTS portfolio_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    company_name VARCHAR(500),
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'DIVIDEND', 'SPLIT')),
    quantity DECIMAL(20, 8) NOT NULL,
    price_per_share DECIMAL(20, 4) NOT NULL CHECK (price_per_share >= 0),
    total_amount DECIMAL(20, 4) GENERATED ALWAYS AS (quantity * price_per_share) STORED,
    fees DECIMAL(20, 4) DEFAULT 0 CHECK (fees >= 0),
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_portfolio_id ON portfolio_transactions(portfolio_id);
CREATE INDEX idx_transactions_ticker ON portfolio_transactions(ticker);
CREATE INDEX idx_transactions_date ON portfolio_transactions(transaction_date DESC);
CREATE INDEX idx_transactions_type ON portfolio_transactions(transaction_type);

COMMENT ON TABLE portfolio_transactions IS 'All portfolio transactions (buy, sell, dividends, splits)';
COMMENT ON COLUMN portfolio_transactions.transaction_type IS 'Type: BUY, SELL, DIVIDEND, SPLIT';
COMMENT ON COLUMN portfolio_transactions.fees IS 'Transaction fees/commissions';

-- ============================================================================
-- PORTFOLIO SNAPSHOTS TABLE
-- ============================================================================
-- Historical portfolio values for performance tracking
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_value DECIMAL(20, 4) NOT NULL,
    total_cost DECIMAL(20, 4) NOT NULL,
    total_gain_loss DECIMAL(20, 4) NOT NULL,
    gain_loss_pct DECIMAL(10, 4) NOT NULL,
    num_holdings INTEGER NOT NULL,
    snapshot_data JSONB, -- Detailed holdings data at snapshot time
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_snapshot_per_day UNIQUE (portfolio_id, snapshot_date)
);

CREATE INDEX idx_snapshots_portfolio_id ON portfolio_snapshots(portfolio_id);
CREATE INDEX idx_snapshots_date ON portfolio_snapshots(snapshot_date DESC);

COMMENT ON TABLE portfolio_snapshots IS 'Historical portfolio values for performance tracking';
COMMENT ON COLUMN portfolio_snapshots.snapshot_data IS 'JSONB with detailed holdings at snapshot time';

-- ============================================================================
-- PORTFOLIO PERFORMANCE TABLE
-- ============================================================================
-- Aggregated performance metrics for each portfolio
CREATE TABLE IF NOT EXISTS portfolio_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL, -- 'all_time', '1y', '3m', '1m', '1w'
    total_return DECIMAL(10, 4) NOT NULL,
    total_return_pct DECIMAL(10, 4) NOT NULL,
    annualized_return_pct DECIMAL(10, 4),
    best_performing_stock VARCHAR(20),
    worst_performing_stock VARCHAR(20),
    total_dividends DECIMAL(20, 4) DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_performance_per_period UNIQUE (portfolio_id, period)
);

CREATE INDEX idx_performance_portfolio_id ON portfolio_performance(portfolio_id);

COMMENT ON TABLE portfolio_performance IS 'Aggregated performance metrics by time period';
COMMENT ON COLUMN portfolio_performance.period IS 'Time period: all_time, 1y, 3m, 1m, 1w';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_performance ENABLE ROW LEVEL SECURITY;

-- Portfolios policies
CREATE POLICY "Users can view their own portfolios"
    ON portfolios FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolios"
    ON portfolios FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios"
    ON portfolios FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios"
    ON portfolios FOR DELETE
    USING (auth.uid() = user_id);

-- Portfolio holdings policies
CREATE POLICY "Users can view holdings in their portfolios"
    ON portfolio_holdings FOR SELECT
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can create holdings in their portfolios"
    ON portfolio_holdings FOR INSERT
    WITH CHECK (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can update holdings in their portfolios"
    ON portfolio_holdings FOR UPDATE
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete holdings in their portfolios"
    ON portfolio_holdings FOR DELETE
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

-- Portfolio transactions policies
CREATE POLICY "Users can view transactions in their portfolios"
    ON portfolio_transactions FOR SELECT
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can create transactions in their portfolios"
    ON portfolio_transactions FOR INSERT
    WITH CHECK (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can update transactions in their portfolios"
    ON portfolio_transactions FOR UPDATE
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete transactions in their portfolios"
    ON portfolio_transactions FOR DELETE
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

-- Portfolio snapshots policies
CREATE POLICY "Users can view snapshots of their portfolios"
    ON portfolio_snapshots FOR SELECT
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can create snapshots of their portfolios"
    ON portfolio_snapshots FOR INSERT
    WITH CHECK (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

-- Portfolio performance policies
CREATE POLICY "Users can view performance of their portfolios"
    ON portfolio_performance FOR SELECT
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can create performance records for their portfolios"
    ON portfolio_performance FOR INSERT
    WITH CHECK (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_portfolio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_portfolios_timestamp
    BEFORE UPDATE ON portfolios
    FOR EACH ROW
    EXECUTE FUNCTION update_portfolio_updated_at();

CREATE TRIGGER update_holdings_timestamp
    BEFORE UPDATE ON portfolio_holdings
    FOR EACH ROW
    EXECUTE FUNCTION update_portfolio_updated_at();

CREATE TRIGGER update_transactions_timestamp
    BEFORE UPDATE ON portfolio_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_portfolio_updated_at();

-- Function: Ensure only one default portfolio per user
CREATE OR REPLACE FUNCTION ensure_single_default_portfolio()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Unset any existing default portfolios for this user
        UPDATE portfolios
        SET is_default = false
        WHERE user_id = NEW.user_id
          AND id != NEW.id
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_default_portfolio
    BEFORE INSERT OR UPDATE ON portfolios
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION ensure_single_default_portfolio();

-- Function: Update holding after transaction
CREATE OR REPLACE FUNCTION update_holding_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
    existing_holding portfolio_holdings%ROWTYPE;
    new_quantity DECIMAL(20, 8);
    new_avg_cost DECIMAL(20, 4);
    new_total_cost DECIMAL(20, 4);
BEGIN
    -- Get existing holding
    SELECT * INTO existing_holding
    FROM portfolio_holdings
    WHERE portfolio_id = NEW.portfolio_id
      AND ticker = NEW.ticker;
    
    IF NEW.transaction_type = 'BUY' THEN
        IF existing_holding.id IS NOT NULL THEN
            -- Update existing holding
            new_quantity := existing_holding.quantity + NEW.quantity;
            new_total_cost := (existing_holding.quantity * existing_holding.avg_cost_basis) + (NEW.quantity * NEW.price_per_share) + NEW.fees;
            new_avg_cost := new_total_cost / new_quantity;
            
            UPDATE portfolio_holdings
            SET quantity = new_quantity,
                avg_cost_basis = new_avg_cost,
                last_transaction_date = NEW.transaction_date,
                updated_at = NOW()
            WHERE id = existing_holding.id;
        ELSE
            -- Create new holding
            INSERT INTO portfolio_holdings (
                portfolio_id, ticker, company_name, quantity, avg_cost_basis,
                first_purchase_date, last_transaction_date
            ) VALUES (
                NEW.portfolio_id, NEW.ticker, NEW.company_name, NEW.quantity,
                NEW.price_per_share + (NEW.fees / NEW.quantity),
                NEW.transaction_date, NEW.transaction_date
            );
        END IF;
        
    ELSIF NEW.transaction_type = 'SELL' THEN
        IF existing_holding.id IS NOT NULL THEN
            new_quantity := existing_holding.quantity - NEW.quantity;
            
            IF new_quantity <= 0.00000001 THEN
                -- Delete holding if quantity is effectively zero
                DELETE FROM portfolio_holdings WHERE id = existing_holding.id;
            ELSE
                -- Update holding with reduced quantity (keep same avg cost)
                UPDATE portfolio_holdings
                SET quantity = new_quantity,
                    last_transaction_date = NEW.transaction_date,
                    updated_at = NOW()
                WHERE id = existing_holding.id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_holding_on_transaction
    AFTER INSERT ON portfolio_transactions
    FOR EACH ROW
    WHEN (NEW.transaction_type IN ('BUY', 'SELL'))
    EXECUTE FUNCTION update_holding_from_transaction();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Note: No seed data for portfolios - users will create their own

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
    -- Check if tables exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'portfolios') THEN
        RAISE EXCEPTION 'Migration failed: portfolios table not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'portfolio_holdings') THEN
        RAISE EXCEPTION 'Migration failed: portfolio_holdings table not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'portfolio_transactions') THEN
        RAISE EXCEPTION 'Migration failed: portfolio_transactions table not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'portfolio_snapshots') THEN
        RAISE EXCEPTION 'Migration failed: portfolio_snapshots table not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'portfolio_performance') THEN
        RAISE EXCEPTION 'Migration failed: portfolio_performance table not created';
    END IF;
    
    RAISE NOTICE 'Migration 007 completed successfully!';
    RAISE NOTICE 'Created tables: portfolios, portfolio_holdings, portfolio_transactions, portfolio_snapshots, portfolio_performance';
    RAISE NOTICE 'Created indexes, RLS policies, and triggers';
END $$;
