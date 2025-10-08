/* eslint-disable camelcase */

const DM_ROLE_NAMES = ['DM', 'Dungeon Master'];
const WORLD_ADMIN_ROLE_NAMES = ['WorldAdmin', 'World Admin'];
const PLAYER_ROLE_NAMES = ['Player'];

exports.up = (pgm) => {
  // --- utility ---
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  // --- races ---
  pgm.createTable('races', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', notNull: true, unique: true },
    description: { type: 'text' },
    created_by: { type: 'uuid', references: '"users"', onDelete: 'set null' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });

  // --- location taxonomy ---
  pgm.createTable('location_types', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', notNull: true, unique: true },
    description: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });

  pgm.createTable('locations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(150)', notNull: true },
    description: { type: 'text' },
    summary: { type: 'varchar(255)' },
    world_id: { type: 'uuid', references: '"worlds"', notNull: true, onDelete: 'cascade' },
    type_id: { type: 'uuid', references: '"location_types"', onDelete: 'set null' },
    created_by: { type: 'uuid', references: '"users"', onDelete: 'set null' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  pgm.createIndex('locations', ['world_id']);
  pgm.createIndex('locations', ['type_id']);

  pgm.createTable('location_visibility', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    location_id: { type: 'uuid', notNull: true, references: '"locations"', onDelete: 'cascade' },
    campaign_id: { type: 'uuid', references: '"campaigns"', onDelete: 'cascade' },
    player_id: { type: 'uuid', references: '"users"', onDelete: 'cascade' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  pgm.addConstraint('location_visibility', 'location_visibility_unique_scope', {
    unique: ['location_id', 'campaign_id', 'player_id']
  });

  // --- organisations ---
  pgm.createTable('organisation_types', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(120)', notNull: true, unique: true },
    description: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });

  pgm.createTable('organisations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(150)', notNull: true },
    description: { type: 'text' },
    motto: { type: 'varchar(255)' },
    world_id: { type: 'uuid', references: '"worlds"', notNull: true, onDelete: 'cascade' },
    type_id: { type: 'uuid', references: '"organisation_types"', onDelete: 'set null' },
    created_by: { type: 'uuid', references: '"users"', onDelete: 'set null' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  pgm.createIndex('organisations', ['world_id']);
  pgm.createIndex('organisations', ['type_id']);

  pgm.createTable('organisation_visibility', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organisation_id: { type: 'uuid', notNull: true, references: '"organisations"', onDelete: 'cascade' },
    campaign_id: { type: 'uuid', references: '"campaigns"', onDelete: 'cascade' },
    player_id: { type: 'uuid', references: '"users"', onDelete: 'cascade' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  pgm.addConstraint('organisation_visibility', 'organisation_visibility_unique_scope', {
    unique: ['organisation_id', 'campaign_id', 'player_id']
  });

  pgm.createTable('organisation_locations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organisation_id: { type: 'uuid', notNull: true, references: '"organisations"', onDelete: 'cascade' },
    location_id: { type: 'uuid', notNull: true, references: '"locations"', onDelete: 'cascade' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  pgm.addConstraint('organisation_locations', 'organisation_locations_unique_pair', {
    unique: ['organisation_id', 'location_id']
  });

  pgm.createTable('organisation_relationships', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organisation_id: { type: 'uuid', notNull: true, references: '"organisations"', onDelete: 'cascade' },
    related_organisation_id: { type: 'uuid', notNull: true, references: '"organisations"', onDelete: 'cascade' },
    relationship_type: { type: 'varchar(100)' },
    description: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  pgm.addConstraint('organisation_relationships', 'organisation_relationships_not_reflexive', {
    check: 'organisation_id <> related_organisation_id'
  });
  pgm.sql(`
    CREATE UNIQUE INDEX organisation_relationship_pair_idx
    ON organisation_relationships (
      LEAST(organisation_id::text, related_organisation_id::text),
      GREATEST(organisation_id::text, related_organisation_id::text),
      COALESCE(relationship_type, '')
    );
  `);

  // --- NPCs ---
  pgm.createTable('npc_types', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(120)', notNull: true, unique: true },
    description: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });

  pgm.createTable('npcs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(150)', notNull: true },
    description: { type: 'text' },
    demeanor: { type: 'varchar(255)' },
    world_id: { type: 'uuid', references: '"worlds"', notNull: true, onDelete: 'cascade' },
    race_id: { type: 'uuid', references: '"races"', onDelete: 'set null' },
    type_id: { type: 'uuid', references: '"npc_types"', onDelete: 'set null' },
    created_by: { type: 'uuid', references: '"users"', onDelete: 'set null' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  pgm.createIndex('npcs', ['world_id']);
  pgm.createIndex('npcs', ['race_id']);
  pgm.createIndex('npcs', ['type_id']);

  pgm.createTable('npc_visibility', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    npc_id: { type: 'uuid', notNull: true, references: '"npcs"', onDelete: 'cascade' },
    campaign_id: { type: 'uuid', references: '"campaigns"', onDelete: 'cascade' },
    player_id: { type: 'uuid', references: '"users"', onDelete: 'cascade' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  pgm.addConstraint('npc_visibility', 'npc_visibility_unique_scope', {
    unique: ['npc_id', 'campaign_id', 'player_id']
  });

  pgm.createType('npc_note_visibility_level', ['Private', 'Party', 'DM']);
  pgm.createTable('npc_notes', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    npc_id: { type: 'uuid', notNull: true, references: '"npcs"', onDelete: 'cascade' },
    author_id: { type: 'uuid', references: '"users"', onDelete: 'set null' },
    content: { type: 'text', notNull: true },
    visibility_level: { type: 'npc_note_visibility_level', notNull: true, default: 'Private' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });

  pgm.createTable('npc_relationships', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    npc_id: { type: 'uuid', notNull: true, references: '"npcs"', onDelete: 'cascade' },
    related_npc_id: { type: 'uuid', notNull: true, references: '"npcs"', onDelete: 'cascade' },
    relationship_type: { type: 'varchar(100)' },
    description: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  pgm.addConstraint('npc_relationships', 'npc_relationships_not_reflexive', {
    check: 'npc_id <> related_npc_id'
  });
  pgm.sql(`
    CREATE UNIQUE INDEX npc_relationship_pair_idx
    ON npc_relationships (
      LEAST(npc_id::text, related_npc_id::text),
      GREATEST(npc_id::text, related_npc_id::text),
      COALESCE(relationship_type, '')
    );
  `);

  // --- seed system roles aligned with platform roles ---
  const insertRole = (name, description) => `
    INSERT INTO system_roles (id, name, description)
    VALUES (gen_random_uuid(), '${name.replace(/'/g, "''")}', '${description.replace(/'/g, "''")}')
    ON CONFLICT (name) DO NOTHING;
  `;

  [...WORLD_ADMIN_ROLE_NAMES, ...DM_ROLE_NAMES, ...PLAYER_ROLE_NAMES].forEach((roleName) => {
    let description = '';
    if (WORLD_ADMIN_ROLE_NAMES.includes(roleName)) description = 'World-level administration rights.';
    else if (DM_ROLE_NAMES.includes(roleName)) description = 'Dungeon Master access for assigned campaigns.';
    else description = 'Player access scoped by character context.';
    pgm.sql(insertRole(roleName, description));
  });
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS npc_relationship_pair_idx');
  pgm.sql('DROP INDEX IF EXISTS organisation_relationship_pair_idx');
  pgm.dropTable('npc_relationships');
  pgm.dropTable('npc_notes');
  pgm.dropType('npc_note_visibility_level');
  pgm.dropTable('npc_visibility');
  pgm.dropTable('npcs');
  pgm.dropTable('npc_types');
  pgm.dropTable('organisation_relationships');
  pgm.dropTable('organisation_locations');
  pgm.dropTable('organisation_visibility');
  pgm.dropTable('organisations');
  pgm.dropTable('organisation_types');
  pgm.dropTable('location_visibility');
  pgm.dropTable('locations');
  pgm.dropTable('location_types');
  pgm.dropTable('races');
};
