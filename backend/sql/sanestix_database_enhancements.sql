/*
    Sanestix CRM - SQL Server Database Enhancements
    Run after Alembic has created the base schema.

    Scope:
      - Indexes for common API filters, joins, and dashboard aggregations.
      - Views that simplify reporting and app-layer joins.
      - Stored procedures for transactional CRM workflows.
      - Triggers for audit logging and data integrity that spans rows/tables.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* --------------------------------------------------------------------------
   AUDIT SUPPORT TABLE
   Why: Triggers need a durable place to record sensitive workflow changes.
   How: Stores compact JSON snapshots. For very high volume, partition by
        changed_at or archive old rows.
--------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.crm_audit_log', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.crm_audit_log
    (
        audit_id       BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT pk_crm_audit_log PRIMARY KEY,
        table_name     SYSNAME NOT NULL,
        primary_key_id INT NOT NULL,
        action_type    NVARCHAR(20) NOT NULL,
        old_values     NVARCHAR(MAX) NULL,
        new_values     NVARCHAR(MAX) NULL,
        changed_at     DATETIME2(3) NOT NULL CONSTRAINT df_crm_audit_log_changed_at DEFAULT SYSUTCDATETIME(),
        changed_by     SYSNAME NOT NULL CONSTRAINT df_crm_audit_log_changed_by DEFAULT SUSER_SNAME()
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_crm_audit_log_table_key_time' AND object_id = OBJECT_ID(N'dbo.crm_audit_log'))
BEGIN
    CREATE INDEX ix_crm_audit_log_table_key_time
        ON dbo.crm_audit_log (table_name, primary_key_id, changed_at DESC)
        INCLUDE (action_type, changed_by);
END;
GO

/* --------------------------------------------------------------------------
   INDEXES
   Why: Existing migration adds basic indexes. These composite/filtered indexes
        match the app's most common access patterns and avoid scanning
        soft-deleted rows.
   How: Guarded creation keeps the script safe to re-run.
--------------------------------------------------------------------------- */

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_accounts_active_owner_company' AND object_id = OBJECT_ID(N'dbo.accounts'))
BEGIN
    CREATE INDEX ix_accounts_active_owner_company
        ON dbo.accounts (owner_id, company_name)
        INCLUDE (industry, annual_revenue, created_at)
        WHERE is_deleted = 0;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_leads_active_owner_status_created' AND object_id = OBJECT_ID(N'dbo.leads'))
BEGIN
    CREATE INDEX ix_leads_active_owner_status_created
        ON dbo.leads (owner_id, status, created_at DESC)
        INCLUDE (first_name, last_name, email, company_name, estimated_value, source)
        WHERE is_deleted = 0;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_opportunities_active_stage_owner' AND object_id = OBJECT_ID(N'dbo.opportunities'))
BEGIN
    CREATE INDEX ix_opportunities_active_stage_owner
        ON dbo.opportunities (stage, owner_id, updated_at DESC)
        INCLUDE (account_id, name, deal_value, probability, created_at)
        WHERE is_deleted = 0;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_opportunities_active_account' AND object_id = OBJECT_ID(N'dbo.opportunities'))
BEGIN
    CREATE INDEX ix_opportunities_active_account
        ON dbo.opportunities (account_id, stage)
        INCLUDE (name, deal_value, probability, owner_id)
        WHERE is_deleted = 0;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_projects_active_status_dates' AND object_id = OBJECT_ID(N'dbo.projects'))
BEGIN
    CREATE INDEX ix_projects_active_status_dates
        ON dbo.projects (status, start_date, end_date)
        INCLUDE (account_id, opportunity_id, budget, monthly_retainer, estimated_hours, burned_hours)
        WHERE is_deleted = 0;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_tasks_active_assignee_status_due' AND object_id = OBJECT_ID(N'dbo.tasks'))
BEGIN
    CREATE INDEX ix_tasks_active_assignee_status_due
        ON dbo.tasks (assigned_to_id, status, due_date)
        INCLUDE (title, task_type, lead_id, opportunity_id, created_by_id, created_at)
        WHERE is_deleted = 0;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_tasks_active_opportunity_status' AND object_id = OBJECT_ID(N'dbo.tasks'))
BEGIN
    CREATE INDEX ix_tasks_active_opportunity_status
        ON dbo.tasks (opportunity_id, status, due_date)
        INCLUDE (title, assigned_to_id)
        WHERE is_deleted = 0 AND opportunity_id IS NOT NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_developer_allocations_dev_project_week' AND object_id = OBJECT_ID(N'dbo.developer_allocations'))
BEGIN
    CREATE UNIQUE INDEX ux_developer_allocations_dev_project_week
        ON dbo.developer_allocations (developer_id, project_id, week_start);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_developer_allocations_dev_week' AND object_id = OBJECT_ID(N'dbo.developer_allocations'))
BEGIN
    CREATE INDEX ix_developer_allocations_dev_week
        ON dbo.developer_allocations (developer_id, week_start)
        INCLUDE (project_id, hours_allocated);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_revenue_points_month_date_desc' AND object_id = OBJECT_ID(N'dbo.revenue_points'))
BEGIN
    CREATE INDEX ix_revenue_points_month_date_desc
        ON dbo.revenue_points (month_date DESC)
        INCLUDE (month_label, mrr, arr, pipeline);
END;
GO

/* --------------------------------------------------------------------------
   VIEWS
--------------------------------------------------------------------------- */

CREATE OR ALTER VIEW dbo.vw_active_pipeline
AS
    SELECT
        o.id AS opportunity_id,
        o.name AS opportunity_name,
        o.stage,
        o.deal_value,
        o.probability,
        CAST(ISNULL(o.deal_value, 0) * ISNULL(o.probability, 0) / 100.0 AS DECIMAL(18,4)) AS weighted_value,
        a.id AS account_id,
        a.company_name,
        a.industry,
        u.id AS owner_id,
        CONCAT(u.first_name, N' ', u.last_name) AS owner_name,
        o.created_at,
        o.updated_at
    FROM dbo.opportunities AS o
    INNER JOIN dbo.accounts AS a ON a.id = o.account_id AND a.is_deleted = 0
    INNER JOIN dbo.users AS u ON u.id = o.owner_id AND u.is_deleted = 0
    WHERE o.is_deleted = 0
      AND o.stage NOT IN (N'closed_won', N'closed_lost');
GO

CREATE OR ALTER VIEW dbo.vw_resource_heatmap
AS
    SELECT
        da.week_start,
        d.id AS developer_id,
        d.name AS developer_name,
        d.role,
        d.weekly_capacity,
        SUM(da.hours_allocated) AS allocated_hours,
        CAST(
            CASE WHEN d.weekly_capacity > 0
                THEN
                    CASE
                        WHEN 100.0 * SUM(da.hours_allocated) / d.weekly_capacity > 100 THEN 100
                        ELSE 100.0 * SUM(da.hours_allocated) / d.weekly_capacity
                    END
                ELSE 0
            END AS DECIMAL(6,2)
        ) AS utilization_pct
    FROM dbo.developer_allocations AS da
    INNER JOIN dbo.developers AS d ON d.id = da.developer_id
    WHERE d.is_deleted = 0
      AND d.is_active = 1
    GROUP BY da.week_start, d.id, d.name, d.role, d.weekly_capacity;
GO

CREATE OR ALTER VIEW dbo.vw_task_backlog
AS
    SELECT
        t.id AS task_id,
        t.title,
        t.task_type,
        t.status,
        t.due_date,
        CASE
            WHEN t.due_date IS NOT NULL AND t.due_date < SYSUTCDATETIME() AND t.status NOT IN (N'completed', N'cancelled') THEN 1
            ELSE 0
        END AS is_overdue,
        t.lead_id,
        l.company_name AS lead_company,
        t.opportunity_id,
        o.name AS opportunity_name,
        t.assigned_to_id,
        CONCAT(assignee.first_name, N' ', assignee.last_name) AS assigned_to_name,
        t.created_by_id,
        CONCAT(creator.first_name, N' ', creator.last_name) AS created_by_name,
        t.created_at,
        t.updated_at
    FROM dbo.tasks AS t
    INNER JOIN dbo.users AS assignee ON assignee.id = t.assigned_to_id
    INNER JOIN dbo.users AS creator ON creator.id = t.created_by_id
    LEFT JOIN dbo.leads AS l ON l.id = t.lead_id
    LEFT JOIN dbo.opportunities AS o ON o.id = t.opportunity_id
    WHERE t.is_deleted = 0;
GO

CREATE OR ALTER VIEW dbo.vw_revenue_monthly_trend
AS
    SELECT
        rp.month_date,
        rp.month_label,
        rp.mrr,
        rp.arr,
        rp.pipeline,
        LAG(rp.mrr) OVER (ORDER BY rp.month_date) AS previous_mrr,
        CAST(
            CASE
                WHEN LAG(rp.mrr) OVER (ORDER BY rp.month_date) > 0
                THEN ((rp.mrr - LAG(rp.mrr) OVER (ORDER BY rp.month_date)) / LAG(rp.mrr) OVER (ORDER BY rp.month_date)) * 100.0
                ELSE 0
            END AS DECIMAL(9,2)
        ) AS mrr_growth_pct
    FROM dbo.revenue_points AS rp;
GO

/* --------------------------------------------------------------------------
   STORED PROCEDURES
--------------------------------------------------------------------------- */

CREATE OR ALTER PROCEDURE dbo.usp_CRM_DashboardStats
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LatestMRR DECIMAL(18,4) = 0,
            @LatestARR DECIMAL(18,4) = 0,
            @PrevMRR DECIMAL(18,4) = 0;

    ;WITH ranked_revenue AS
    (
        SELECT mrr, arr, ROW_NUMBER() OVER (ORDER BY month_date DESC) AS rn
        FROM dbo.revenue_points
    )
    SELECT
        @LatestMRR = MAX(CASE WHEN rn = 1 THEN mrr ELSE 0 END),
        @LatestARR = MAX(CASE WHEN rn = 1 THEN arr ELSE 0 END),
        @PrevMRR   = MAX(CASE WHEN rn = 2 THEN mrr ELSE 0 END)
    FROM ranked_revenue
    WHERE rn IN (1, 2);

    SELECT
        @LatestMRR AS mrr,
        CASE WHEN @PrevMRR > 0 THEN CAST(((@LatestMRR - @PrevMRR) / @PrevMRR) * 100.0 AS DECIMAL(9,2)) ELSE 0 END AS mrr_growth,
        @LatestARR AS arr,
        (SELECT COUNT_BIG(*) FROM dbo.projects WHERE is_deleted = 0 AND status IN (N'kickoff', N'in_progress', N'uat')) AS active_projects,
        (SELECT COUNT_BIG(*) FROM dbo.opportunities WHERE is_deleted = 0 AND stage IN (N'discovery', N'proposal', N'negotiation')) AS open_deals,
        (SELECT ISNULL(SUM(deal_value), 0) FROM dbo.opportunities WHERE is_deleted = 0 AND stage IN (N'discovery', N'proposal', N'negotiation')) AS open_deals_value,
        (SELECT COUNT_BIG(*) FROM dbo.developers WHERE is_deleted = 0 AND is_active = 1) AS team_size;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ConvertLeadToOpportunity
    @lead_id INT,
    @owner_id INT,
    @opportunity_name NVARCHAR(255) = NULL,
    @deal_value DECIMAL(18,4) = NULL,
    @probability INT = 25,
    @create_followup_task BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF @probability < 0 OR @probability > 100
            THROW 51000, 'Probability must be between 0 and 100.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @owner_id AND is_deleted = 0 AND is_active = 1)
            THROW 51001, 'Owner user does not exist or is inactive.', 1;

        DECLARE
            @company_name NVARCHAR(255),
            @lead_email NVARCHAR(255),
            @account_id INT,
            @opportunity_id INT;

        SELECT
            @company_name = COALESCE(NULLIF(company_name, N''), CONCAT(first_name, N' ', last_name)),
            @lead_email = email,
            @deal_value = COALESCE(@deal_value, estimated_value)
        FROM dbo.leads WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @lead_id
          AND is_deleted = 0
          AND status NOT IN (N'converted', N'lost', N'disqualified');

        IF @company_name IS NULL
            THROW 51002, 'Lead does not exist or is not convertible.', 1;

        SELECT @account_id = id
        FROM dbo.accounts WITH (UPDLOCK, HOLDLOCK)
        WHERE is_deleted = 0
          AND company_name = @company_name;

        IF @account_id IS NULL
        BEGIN
            INSERT dbo.accounts (company_name, owner_id, created_at, updated_at, is_deleted)
            VALUES (@company_name, @owner_id, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);

            SET @account_id = SCOPE_IDENTITY();
        END;

        INSERT dbo.opportunities
        (
            name, stage, deal_value, probability, account_id, owner_id,
            created_at, updated_at, is_deleted
        )
        VALUES
        (
            COALESCE(@opportunity_name, CONCAT(@company_name, N' Opportunity')),
            N'discovery',
            @deal_value,
            @probability,
            @account_id,
            @owner_id,
            SYSUTCDATETIME(),
            SYSUTCDATETIME(),
            0
        );

        SET @opportunity_id = SCOPE_IDENTITY();

        UPDATE dbo.leads
        SET status = N'converted',
            updated_at = SYSUTCDATETIME()
        WHERE id = @lead_id;

        IF @create_followup_task = 1
        BEGIN
            INSERT dbo.tasks
            (
                title, description, task_type, status, due_date,
                lead_id, opportunity_id, assigned_to_id, created_by_id,
                created_at, updated_at, is_deleted
            )
            VALUES
            (
                CONCAT(N'Follow up converted lead: ', @company_name),
                CONCAT(N'Lead email: ', @lead_email),
                N'follow_up',
                N'pending',
                DATEADD(DAY, 2, SYSUTCDATETIME()),
                @lead_id,
                @opportunity_id,
                @owner_id,
                @owner_id,
                SYSUTCDATETIME(),
                SYSUTCDATETIME(),
                0
            );
        END;

        COMMIT TRANSACTION;

        SELECT @account_id AS account_id, @opportunity_id AS opportunity_id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_UpsertDeveloperAllocation
    @developer_id INT,
    @project_id INT,
    @week_start DATE,
    @hours_allocated FLOAT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF @hours_allocated < 0
            THROW 51010, 'Allocated hours cannot be negative.', 1;

        IF DATEDIFF(DAY, '19000101', @week_start) % 7 <> 0
            THROW 51011, 'week_start must be a Monday.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.developers WHERE id = @developer_id AND is_deleted = 0 AND is_active = 1)
            THROW 51012, 'Developer does not exist or is inactive.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.projects WHERE id = @project_id AND is_deleted = 0)
            THROW 51013, 'Project does not exist.', 1;

        MERGE dbo.developer_allocations WITH (HOLDLOCK) AS target
        USING (SELECT @developer_id AS developer_id, @project_id AS project_id, @week_start AS week_start) AS source
        ON target.developer_id = source.developer_id
           AND target.project_id = source.project_id
           AND target.week_start = source.week_start
        WHEN MATCHED THEN
            UPDATE SET hours_allocated = @hours_allocated, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
            INSERT (developer_id, project_id, week_start, hours_allocated, created_at, updated_at)
            VALUES (@developer_id, @project_id, @week_start, @hours_allocated, SYSUTCDATETIME(), SYSUTCDATETIME());

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_CreateMonthlyRevenueSnapshot
    @month_date DATE
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @first_of_month DATE = DATEFROMPARTS(YEAR(@month_date), MONTH(@month_date), 1);
    DECLARE @month_label NVARCHAR(20) = FORMAT(@first_of_month, 'MMM yyyy', 'en-US');

    DECLARE @mrr DECIMAL(18,4) =
    (
        SELECT ISNULL(SUM(monthly_retainer), 0)
        FROM dbo.projects
        WHERE is_deleted = 0
          AND status IN (N'kickoff', N'in_progress', N'uat')
          AND monthly_retainer IS NOT NULL
    );

    DECLARE @pipeline DECIMAL(18,4) =
    (
        SELECT ISNULL(SUM(ISNULL(deal_value, 0) * ISNULL(probability, 0) / 100.0), 0)
        FROM dbo.opportunities
        WHERE is_deleted = 0
          AND stage IN (N'discovery', N'proposal', N'negotiation')
    );

    MERGE dbo.revenue_points WITH (HOLDLOCK) AS target
    USING (SELECT @first_of_month AS month_date) AS source
    ON target.month_date = source.month_date
    WHEN MATCHED THEN
        UPDATE SET
            month_label = @month_label,
            mrr = @mrr,
            arr = @mrr * 12,
            pipeline = @pipeline,
            updated_at = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
        INSERT (month_label, month_date, mrr, arr, pipeline, created_at, updated_at)
        VALUES (@month_label, @first_of_month, @mrr, @mrr * 12, @pipeline, SYSUTCDATETIME(), SYSUTCDATETIME());
END;
GO

/* --------------------------------------------------------------------------
   TRIGGERS
--------------------------------------------------------------------------- */

CREATE OR ALTER TRIGGER dbo.trg_developer_allocations_validate_capacity
ON dbo.developer_allocations
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM inserted WHERE hours_allocated < 0)
        THROW 52000, 'Allocated hours cannot be negative.', 1;

    IF EXISTS (SELECT 1 FROM inserted WHERE DATEDIFF(DAY, '19000101', week_start) % 7 <> 0)
        THROW 52001, 'week_start must be a Monday.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM
        (
            SELECT da.developer_id, da.week_start, SUM(da.hours_allocated) AS total_hours
            FROM dbo.developer_allocations AS da
            INNER JOIN inserted AS i
                ON i.developer_id = da.developer_id
               AND i.week_start = da.week_start
            GROUP BY da.developer_id, da.week_start
        ) AS weekly
        INNER JOIN dbo.developers AS d ON d.id = weekly.developer_id
        WHERE weekly.total_hours > d.weekly_capacity
    )
        THROW 52002, 'Developer weekly allocations cannot exceed weekly capacity.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_tasks_validate_parent
ON dbo.tasks
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM inserted WHERE lead_id IS NOT NULL AND opportunity_id IS NOT NULL)
        THROW 52010, 'A task can be linked to either a lead or an opportunity, not both.', 1;

    IF EXISTS (SELECT 1 FROM inserted WHERE due_date IS NOT NULL AND due_date < created_at)
        THROW 52011, 'Task due_date cannot be earlier than created_at.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_opportunities_closed_won_create_project
ON dbo.opportunities
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT dbo.projects
    (
        name, status, deal_type, budget, monthly_retainer, start_date,
        account_id, opportunity_id, created_at, updated_at, is_deleted
    )
    SELECT
        i.name,
        N'kickoff',
        N'fixed_cost',
        i.deal_value,
        NULL,
        CAST(SYSUTCDATETIME() AS DATE),
        i.account_id,
        i.id,
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        0
    FROM inserted AS i
    INNER JOIN deleted AS d ON d.id = i.id
    WHERE i.stage = N'closed_won'
      AND d.stage <> N'closed_won'
      AND i.is_deleted = 0
      AND NOT EXISTS
      (
          SELECT 1
          FROM dbo.projects AS p
          WHERE p.opportunity_id = i.id
            AND p.is_deleted = 0
      );
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_opportunities_audit
ON dbo.opportunities
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT dbo.crm_audit_log (table_name, primary_key_id, action_type, old_values, new_values)
    SELECT
        N'opportunities',
        COALESCE(i.id, d.id),
        CASE
            WHEN i.id IS NOT NULL AND d.id IS NULL THEN N'INSERT'
            WHEN i.id IS NOT NULL AND d.id IS NOT NULL THEN N'UPDATE'
            ELSE N'DELETE'
        END,
        CASE WHEN d.id IS NULL THEN NULL ELSE
            (SELECT d.name, d.stage, d.deal_value, d.probability, d.account_id, d.owner_id, d.is_deleted FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
        END,
        CASE WHEN i.id IS NULL THEN NULL ELSE
            (SELECT i.name, i.stage, i.deal_value, i.probability, i.account_id, i.owner_id, i.is_deleted FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
        END
    FROM inserted AS i
    FULL OUTER JOIN deleted AS d ON d.id = i.id;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_tasks_audit
ON dbo.tasks
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT dbo.crm_audit_log (table_name, primary_key_id, action_type, old_values, new_values)
    SELECT
        N'tasks',
        COALESCE(i.id, d.id),
        CASE
            WHEN i.id IS NOT NULL AND d.id IS NULL THEN N'INSERT'
            WHEN i.id IS NOT NULL AND d.id IS NOT NULL THEN N'UPDATE'
            ELSE N'DELETE'
        END,
        CASE WHEN d.id IS NULL THEN NULL ELSE
            (SELECT d.title, d.status, d.task_type, d.due_date, d.lead_id, d.opportunity_id, d.assigned_to_id, d.is_deleted FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
        END,
        CASE WHEN i.id IS NULL THEN NULL ELSE
            (SELECT i.title, i.status, i.task_type, i.due_date, i.lead_id, i.opportunity_id, i.assigned_to_id, i.is_deleted FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
        END
    FROM inserted AS i
    FULL OUTER JOIN deleted AS d ON d.id = i.id;
END;
GO
