import {
  Npc,
  NpcType,
  NpcVisibility,
  NpcNote,
  NpcRelationship,
  Race,
  Campaign,
  User
} from '../models/index.js';
import {
  applyWorldScope,
  buildVisibilityInclude,
  normalizeVisibilityEntries,
  resolveDefaultVisibility,
  syncVisibilityEntries
} from '../utils/visibility.js';

const npcListIncludes = (context) => ([
  { model: NpcType, as: 'type' },
  { model: Race, as: 'race' },
  buildVisibilityInclude({
    context,
    model: NpcVisibility,
    as: 'visibility',
    include: [
      { model: Campaign, as: 'campaign', attributes: ['id', 'name'] },
      { model: User, as: 'player', attributes: ['id', 'username'] }
    ]
  })
]);

const npcDetailIncludes = (context) => ([
  ...npcListIncludes(context),
  {
    model: NpcNote,
    as: 'notes',
    include: [{ model: User, as: 'author', attributes: ['id', 'username'] }]
  },
  {
    model: NpcRelationship,
    as: 'relationships',
    include: [{ model: Npc, as: 'relatedNpc', attributes: ['id', 'name'] }]
  }
]);

const ensurePrivileged = (context) => context?.isWorldAdmin || context?.isDm;

const filterNotesForContext = (notes, context) => {
  if (!Array.isArray(notes)) return [];
  if (context?.bypassVisibility) {
    return notes;
  }

  return notes.filter((note) => {
    if (note.visibility_level === 'DM') return false;
    if (note.visibility_level === 'Private') {
      return note.author_id === context?.playerId;
    }
    if (note.visibility_level === 'Party') {
      return Boolean(context?.campaignId);
    }
    return false;
  });
};

const loadNpc = async (id, context) => Npc.findByPk(id, {
  include: npcDetailIncludes(context)
});

export const listNpcs = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (context?.restrictAll && !context?.bypassVisibility) {
      return res.json({ success: true, data: [] });
    }

    const where = applyWorldScope({}, context);
    const npcs = await Npc.findAll({
      where,
      include: npcListIncludes(context),
      order: [['name', 'ASC']],
      distinct: true
    });

    res.json({ success: true, data: npcs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getNpc = async (req, res) => {
  try {
    const context = req.visibilityContext;
    const npc = await loadNpc(req.params.id, context);
    if (!npc) {
      return res.status(404).json({ success: false, message: 'NPC not found' });
    }

    if (!context?.bypassVisibility) {
      const visible = npc.visibility?.some((entry) => {
        if (entry.campaign_id && context?.campaignId && entry.campaign_id === context.campaignId) return true;
        if (entry.player_id && entry.player_id === context?.playerId) return true;
        return entry.campaign_id === null && entry.player_id === null;
      });
      if (!visible) {
        return res.status(403).json({ success: false, message: 'NPC is not visible in this context' });
      }
    }

    const plain = npc.get({ plain: true });
    plain.notes = filterNotesForContext(plain.notes, context);
    res.json({ success: true, data: plain });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createNpc = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!ensurePrivileged(context)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to create NPCs' });
    }

    const { name, description, demeanor, worldId, typeId, raceId, visibility } = req.body;
    const effectiveWorldId = worldId || context?.worldId || context?.worldScope?.[0];

    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }
    if (!effectiveWorldId) {
      return res.status(400).json({ success: false, message: 'worldId is required for NPCs' });
    }

    const npc = await Npc.create({
      name,
      description,
      demeanor,
      world_id: effectiveWorldId,
      type_id: typeId || null,
      race_id: raceId || null,
      created_by: req.user.id,
      created_at: new Date(),
      updated_at: new Date()
    });

    const visibilityEntries = normalizeVisibilityEntries(visibility?.length ? visibility : resolveDefaultVisibility(context));
    if (visibilityEntries.length) {
      await syncVisibilityEntries(NpcVisibility, 'npc_id', npc.id, visibilityEntries);
    }

    const hydrated = await loadNpc(npc.id, context);
    const plain = hydrated.get({ plain: true });
    plain.notes = filterNotesForContext(plain.notes, context);
    res.status(201).json({ success: true, data: plain, message: 'NPC created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateNpc = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!ensurePrivileged(context)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to update NPCs' });
    }

    const npc = await Npc.findByPk(req.params.id);
    if (!npc) {
      return res.status(404).json({ success: false, message: 'NPC not found' });
    }

    const { name, description, demeanor, worldId, typeId, raceId, visibility } = req.body;

    if (typeof name !== 'undefined') npc.name = name;
    if (typeof description !== 'undefined') npc.description = description;
    if (typeof demeanor !== 'undefined') npc.demeanor = demeanor;
    if (typeof worldId !== 'undefined') npc.world_id = worldId || npc.world_id;
    if (typeof typeId !== 'undefined') npc.type_id = typeId || null;
    if (typeof raceId !== 'undefined') npc.race_id = raceId || null;
    npc.updated_at = new Date();

    await npc.save();

    if (visibility) {
      await syncVisibilityEntries(NpcVisibility, 'npc_id', npc.id, visibility);
    }

    const hydrated = await loadNpc(npc.id, context);
    const plain = hydrated.get({ plain: true });
    plain.notes = filterNotesForContext(plain.notes, context);
    res.json({ success: true, data: plain, message: 'NPC updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNpc = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!ensurePrivileged(context)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to delete NPCs' });
    }

    const npc = await Npc.findByPk(req.params.id);
    if (!npc) {
      return res.status(404).json({ success: false, message: 'NPC not found' });
    }

    await npc.destroy();
    res.json({ success: true, data: null, message: 'NPC deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addNpcNote = async (req, res) => {
  try {
    const context = req.visibilityContext;
    const npc = await Npc.findByPk(req.params.id);
    if (!npc) {
      return res.status(404).json({ success: false, message: 'NPC not found' });
    }

    const { content, visibilityLevel = 'Private' } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'content is required' });
    }

    if (!context?.bypassVisibility) {
      if (visibilityLevel === 'DM') {
        return res.status(403).json({ success: false, message: 'Players cannot create DM-only notes' });
      }
      if (visibilityLevel === 'Party' && !context?.campaignId) {
        return res.status(400).json({ success: false, message: 'Party notes require an active campaign' });
      }
    }

    const note = await NpcNote.create({
      npc_id: npc.id,
      author_id: req.user.id,
      content,
      visibility_level: visibilityLevel,
      created_at: new Date(),
      updated_at: new Date()
    });

    const hydrated = await NpcNote.findByPk(note.id, { include: [{ model: User, as: 'author', attributes: ['id', 'username'] }] });
    const plain = hydrated.get({ plain: true });
    if (!context?.bypassVisibility) {
      const filtered = filterNotesForContext([plain], context);
      if (!filtered.length) {
        return res.status(403).json({ success: false, message: 'Note visibility does not match current context' });
      }
    }

    res.status(201).json({ success: true, data: plain, message: 'Note created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateNpcNote = async (req, res) => {
  try {
    const context = req.visibilityContext;
    const note = await NpcNote.findByPk(req.params.noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: 'NPC note not found' });
    }

    if (!context?.bypassVisibility && note.author_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only update your own notes' });
    }

    const { content, visibilityLevel } = req.body;
    if (typeof content !== 'undefined') note.content = content;
    if (typeof visibilityLevel !== 'undefined') {
      if (!context?.bypassVisibility && visibilityLevel === 'DM') {
        return res.status(403).json({ success: false, message: 'Players cannot create DM-only notes' });
      }
      if (!context?.bypassVisibility && visibilityLevel === 'Party' && !context?.campaignId) {
        return res.status(400).json({ success: false, message: 'Party notes require an active campaign' });
      }
      note.visibility_level = visibilityLevel;
    }
    note.updated_at = new Date();

    await note.save();
    const hydrated = await NpcNote.findByPk(note.id, { include: [{ model: User, as: 'author', attributes: ['id', 'username'] }] });
    const plain = hydrated.get({ plain: true });
    if (!context?.bypassVisibility) {
      const filtered = filterNotesForContext([plain], context);
      if (!filtered.length) {
        return res.status(403).json({ success: false, message: 'Note visibility does not match current context' });
      }
    }

    res.json({ success: true, data: plain, message: 'Note updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNpcNote = async (req, res) => {
  try {
    const context = req.visibilityContext;
    const note = await NpcNote.findByPk(req.params.noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: 'NPC note not found' });
    }

    if (!context?.bypassVisibility && note.author_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only delete your own notes' });
    }

    await note.destroy();
    res.json({ success: true, data: null, message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listNpcTypes = async (_req, res) => {
  try {
    const types = await NpcType.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createNpcType = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!context?.isWorldAdmin) {
      return res.status(403).json({ success: false, message: 'Only world admins may manage NPC types' });
    }

    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const type = await NpcType.create({ name, description, created_at: new Date() });
    res.status(201).json({ success: true, data: type, message: 'NPC type created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateNpcType = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!context?.isWorldAdmin) {
      return res.status(403).json({ success: false, message: 'Only world admins may manage NPC types' });
    }

    const type = await NpcType.findByPk(req.params.id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'NPC type not found' });
    }

    const { name, description } = req.body;
    if (typeof name !== 'undefined') type.name = name;
    if (typeof description !== 'undefined') type.description = description;
    await type.save();

    res.json({ success: true, data: type, message: 'NPC type updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNpcType = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!context?.isWorldAdmin) {
      return res.status(403).json({ success: false, message: 'Only world admins may manage NPC types' });
    }

    const type = await NpcType.findByPk(req.params.id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'NPC type not found' });
    }

    await type.destroy();
    res.json({ success: true, data: null, message: 'NPC type deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
