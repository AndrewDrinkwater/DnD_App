/* eslint-disable camelcase */

exports.up = (pgm) => {
  // === users ===
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    username: { type: 'varchar(100)', notNull: true, unique: true },
    email: { type: 'varchar(150)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });

  // === system_roles ===
  pgm.createTable('system_roles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(50)', notNull: true, unique: true },
    description: { type: 'varchar(255)' }
  });

  // === user_system_roles ===
  pgm.createTable('user_system_roles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', references: '"users"', onDelete: 'cascade' },
    system_role_id: { type: 'uuid', references: '"system_roles"', onDelete: 'cascade' },
    assigned_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });

  // seed base system roles
  pgm.sql(`
    INSERT INTO system_roles (id, name, description)
    VALUES
    (gen_random_uuid(), 'Admin', 'Full platform access'),
    (gen_random_uuid(), 'Moderator', 'Limited management'),
    (gen_random_uuid(), 'User', 'Standard platform user');
  `);

  // === worlds ===
  pgm.createTable('worlds', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', notNull: true },
    description: { type: 'text' },
    created_by: { type: 'uuid', references: '"users"', onDelete: 'set null' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });

  // === campaigns ===
  pgm.createTable('campaigns', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', notNull: true },
    description: { type: 'text' },
    created_by: { type: 'uuid', references: '"users"', onDelete: 'set null' },
    world_id: { type: 'uuid', references: '"worlds"', onDelete: 'set null' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });

  // === campaign_roles ===
  pgm.createTable('campaign_roles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(50)', notNull: true },
    description: { type: 'varchar(255)' },
    campaign_id: { type: 'uuid', references: '"campaigns"', onDelete: 'cascade' }
  });

  // === user_campaign_roles ===
  pgm.createTable('user_campaign_roles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', references: '"users"', onDelete: 'cascade' },
    campaign_id: { type: 'uuid', references: '"campaigns"', onDelete: 'cascade' },
    campaign_role_id: { type: 'uuid', references: '"campaign_roles"', onDelete: 'cascade' },
    joined_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });

  // === characters ===
  pgm.createTable('characters', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', notNull: true },
    description: { type: 'text' },
    level: { type: 'integer', default: 1 },
    class: { type: 'varchar(50)' },
    stats_json: { type: 'jsonb', default: '{}' },
    user_id: { type: 'uuid', references: '"users"', onDelete: 'cascade' },
    active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });

  // === character_campaigns ===
  pgm.createTable('character_campaigns', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    character_id: { type: 'uuid', references: '"characters"', onDelete: 'cascade' },
    campaign_id: { type: 'uuid', references: '"campaigns"', onDelete: 'cascade' },
    joined_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
};

exports.down = (pgm) => {
  pgm.dropTable('character_campaigns');
  pgm.dropTable('characters');
  pgm.dropTable('user_campaign_roles');
  pgm.dropTable('campaign_roles');
  pgm.dropTable('campaigns');
  pgm.dropTable('worlds');
  pgm.dropTable('user_system_roles');
  pgm.dropTable('system_roles');
  pgm.dropTable('users');
};
