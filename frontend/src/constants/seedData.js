// src/constants/seedData.js
export const seededRoles = [
  {
    id: 'role-system-admin',
    name: 'System Administrator',
    description: 'Full platform access and configuration rights.',
    createdAt: '2024-01-12T10:15:00Z',
    updatedAt: '2024-04-01T08:25:00Z'
  },
  {
    id: 'role-world-admin',
    name: 'World Admin',
    description: 'Curate the shared world, lore, and regions available to campaigns.',
    createdAt: '2024-01-14T11:00:00Z',
    updatedAt: '2024-03-28T16:12:00Z'
  },
  {
    id: 'role-dungeon-master',
    name: 'Dungeon Master',
    description: 'Owns the storytelling experience for a campaign.',
    createdAt: '2024-02-06T14:10:00Z',
    updatedAt: '2024-03-18T09:32:00Z'
  },
  {
    id: 'role-player',
    name: 'Player',
    description: 'Participates in assigned campaigns with scoped permissions.',
    createdAt: '2024-02-06T14:10:00Z',
    updatedAt: '2024-03-18T09:32:00Z'
  }
]

export const seededUsers = [
  {
    id: 'user-aelar',
    displayName: 'Aelar Morningstar',
    email: 'aelar@example.com',
    username: 'aelar',
    password: 'Temp!123',
    status: 'Active',
    roles: ['role-system-admin', 'role-world-admin'],
    updatedAt: '2024-04-18T12:02:00Z'
  },
  {
    id: 'user-lyra',
    displayName: 'Lyra Willowstep',
    email: 'lyra@example.com',
    username: 'lyra',
    password: 'Welcome1',
    status: 'Invited',
    roles: ['role-player'],
    updatedAt: '2024-04-11T09:44:00Z'
  }
]

export const seededWorlds = [
  {
    id: 'world-faerun',
    name: 'Forgotten Realms',
    tagline: 'A classic high fantasy setting packed with legends.',
    description:
      'The Forgotten Realms spans the continent of Faerûn, from the Spine of the World to the jungles of Chult. Adventurers uncover ancient ruins, broker uneasy alliances, and confront lurking threats from gods and monsters alike.',
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-04-05T18:42:00Z'
  }
]

export const seededCampaigns = [
  {
    id: 'campaign-tiamat',
    name: 'Rise of Tiamat',
    status: 'Planning',
    summary: 'High level threat from the Dragon Queen.',
    worldId: 'world-faerun',
    assignments: [
      { id: 'assign-1', userId: 'user-aelar', roleId: 'role-dungeon-master' },
      { id: 'assign-2', userId: 'user-lyra', roleId: 'role-player' }
    ],
    updatedAt: '2024-04-14T21:00:00Z'
  }
]

export const seededCharacters = [
  {
    id: 'character-lyra',
    name: 'Lyra Willowstep',
    ancestry: 'Lightfoot Halfling',
    className: 'College of Lore Bard',
    level: 7,
    ownerId: 'user-lyra',
    campaignId: 'campaign-tiamat',
    updatedAt: '2024-04-12T14:18:00Z'
  }
]

export const seededNpcs = [
  {
    id: 'npc-leosin',
    name: 'Leosin Erlanthar',
    demeanor: 'Measured and insightful',
    description: "A monk of the Harpers piecing together the Cult of the Dragon's plans.",
    worldId: 'world-faerun',
    raceId: 'race-lightfoot-halfling',
    status: 'Alive',
    causeOfDeath: '',
    locationId: 'location-greenest-refuge',
    hometownId: 'location-greenest',
    campaignIds: ['campaign-tiamat'],
    characterIds: ['character-lyra'],
    visibility: 'party',
    notes: 'Trusts the party but remains wary of cult infiltrators.'
  },
  {
    id: 'npc-rezmir',
    name: 'Rezmir',
    demeanor: 'Cold and ruthless',
    description:
      'Half-dragon tactician orchestrating the movement of hoarded treasure toward the Well of Dragons.',
    worldId: 'world-faerun',
    raceId: '',
    status: 'Unknown',
    causeOfDeath: '',
    locationId: 'location-skyreach',
    hometownId: '',
    campaignIds: ['campaign-tiamat'],
    visibility: 'dm',
    notes: 'Rumours suggest Rezmir seeks to recruit a new clutch of black dragons.'
  },
  {
    id: 'npc-ontharr',
    name: 'Ontharr Frume',
    demeanor: 'Boisterous and honorable',
    description: 'A forthright paladin coordinating the alliance response to the cult raids.',
    worldId: 'world-faerun',
    raceId: '',
    status: 'Alive',
    causeOfDeath: '',
    locationId: 'location-waterdeep-gauntlet',
    hometownId: 'location-waterdeep',
    campaignIds: ['campaign-tiamat'],
    visibility: 'public',
    notes: 'Keeps morale high with nightly feasts and war stories.'
  }
]

export const seededLocations = [
  {
    id: 'location-faerun',
    name: 'Faerûn Heartlands',
    typeId: 'location-type-region',
    parentId: '',
    summary: 'Rolling fields and trade roads linking the Western Heartlands to the Sea of Swords.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    visibility: 'public',
    tags: ['Trade routes', 'Allied patrols'],
    lastScoutedAt: '2024-04-03T09:00:00Z',
    notes: 'Increased militia patrols have disrupted several cult caravans.'
  },
  {
    id: 'location-waterdeep',
    name: 'Waterdeep',
    typeId: 'location-type-city',
    parentId: 'location-faerun',
    summary: 'The City of Splendours, staging ground for allied resistance.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    visibility: 'public',
    tags: ['Alliance', 'Harbour'],
    lastScoutedAt: '2024-04-07T18:00:00Z',
    notes: 'Harper messengers report cult spies probing the Dock Ward.'
  },
  {
    id: 'location-waterdeep-gauntlet',
    name: 'Order of the Gauntlet Chapterhouse',
    typeId: 'location-type-site',
    parentId: 'location-waterdeep',
    summary: 'Fortified manor serving as headquarters for the Order within Waterdeep.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    visibility: 'party',
    tags: ['Allies', 'Briefings'],
    lastScoutedAt: '2024-04-12T12:00:00Z',
    notes: 'Logistics wing preparing relief shipments bound for Greenest.'
  },
  {
    id: 'location-greenest',
    name: 'Greenest',
    typeId: 'location-type-city',
    parentId: 'location-faerun',
    summary: 'A resilient settlement rebuilding after the opening assault from the cult.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    visibility: 'public',
    tags: ['Rebuilding', 'Refugees'],
    lastScoutedAt: '2024-04-08T14:00:00Z',
    notes: 'Governor Nighthill coordinates relief efforts and requests additional healers.'
  },
  {
    id: 'location-greenest-refuge',
    name: 'Greenest Refugee Camp',
    typeId: 'location-type-site',
    parentId: 'location-greenest',
    summary: 'Tents and hastily erected shelters for displaced villagers along the Chionthar.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    characterIds: ['character-lyra'],
    visibility: 'party',
    tags: ['Relief', 'Harper presence'],
    lastScoutedAt: '2024-04-10T22:00:00Z',
    notes: 'Nightly briefings disseminate cult troop movements gathered by scouts.'
  },
  {
    id: 'location-skyreach',
    name: 'Skyreach Castle',
    typeId: 'location-type-site',
    parentId: '',
    summary: 'An ice-carved citadel commandeered by the cult to move tribute swiftly across Faerûn.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    visibility: 'dm',
    tags: ['Mobile stronghold', 'Cult of the Dragon'],
    lastScoutedAt: '2024-04-09T06:00:00Z',
    notes: 'Approach routes are patrolled by wyverns; anchor sigils can be sabotaged from the aerie.'
  }
]

export const seededOrganisations = [
  {
    id: 'organisation-harpers',
    name: 'The Harpers',
    alignment: 'Neutral Good',
    summary: 'A network of agents dedicated to preserving balance and sharing vital intelligence.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    visibility: 'public',
    goals: ['Disrupt the Cult of the Dragon supply lines', 'Protect Greenest refugees'],
    influence: "Covert cells from Baldur's Gate to Neverwinter coordinate nightly reports.",
    allies: ['Order of the Gauntlet'],
    enemies: ['Cult of the Dragon'],
    tags: ['Ally network'],
    lastActivityAt: '2024-04-14T10:20:00Z'
  },
  {
    id: 'organisation-cult-of-the-dragon',
    name: 'Cult of the Dragon',
    alignment: 'Lawful Evil',
    summary: 'Fanatics labouring to summon Tiamat through ritual hoarding and ruthless raids.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    visibility: 'dm',
    goals: ['Deliver treasure caravans to the Well of Dragons', 'Recruit chromatic dragons to the cause'],
    influence: 'Cells stretch from the Mere of Dead Men to the Sunset Mountains.',
    allies: ['Red Wizards of Thay'],
    enemies: ['Harpers', 'Emerald Enclave'],
    tags: ['Primary antagonist'],
    lastActivityAt: '2024-04-15T05:45:00Z'
  },
  {
    id: 'organisation-order-of-the-gauntlet',
    name: 'Order of the Gauntlet',
    alignment: 'Lawful Good',
    summary: 'A coalition of zealous knights and clerics sworn to smite the forces of evil.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    visibility: 'party',
    goals: ['Fortify Waterdeep against retaliatory strikes', 'Escort refugees toward the north'],
    influence: 'Bastions established along the Coast Way rally local militias.',
    allies: ['The Harpers', 'Emerald Enclave'],
    tags: ['Alliance'],
    lastActivityAt: '2024-04-12T16:30:00Z'
  }
]

export const seededRelationships = [
  {
    id: 'relationship-leosin-harpers',
    typeId: 'member',
    orientation: 'forward',
    source: { type: 'npc', id: 'npc-leosin' },
    target: { type: 'organisation', id: 'organisation-harpers' },
    note: 'Trusted field operative reporting directly to Remallia Haventree.',
    createdAt: '2024-04-10T12:00:00Z'
  },
  {
    id: 'relationship-ontharr-gauntlet',
    typeId: 'member',
    orientation: 'forward',
    source: { type: 'npc', id: 'npc-ontharr' },
    target: { type: 'organisation', id: 'organisation-order-of-the-gauntlet' },
    note: 'High-ranking paladin coordinating field deployments.',
    createdAt: '2024-04-11T09:40:00Z'
  },
  {
    id: 'relationship-rezmir-cult',
    typeId: 'employer',
    orientation: 'reverse',
    source: { type: 'npc', id: 'npc-rezmir' },
    target: { type: 'organisation', id: 'organisation-cult-of-the-dragon' },
    note: 'Directly oversees tribute convoys bound for the Well of Dragons.',
    createdAt: '2024-04-08T22:30:00Z'
  },
  {
    id: 'relationship-harpers-gauntlet',
    typeId: 'ally',
    orientation: 'forward',
    source: { type: 'organisation', id: 'organisation-harpers' },
    target: { type: 'organisation', id: 'organisation-order-of-the-gauntlet' },
    note: 'Share reconnaissance on cult troop movements each evening.',
    createdAt: '2024-04-09T18:05:00Z'
  },
  {
    id: 'relationship-leosin-ontharr',
    typeId: 'mentor',
    orientation: 'reverse',
    source: { type: 'npc', id: 'npc-leosin' },
    target: { type: 'npc', id: 'npc-ontharr' },
    note: 'Ontharr guided Leosin through Order of the Gauntlet combat drills in youth.',
    createdAt: '2024-04-07T16:45:00Z'
  },
  {
    id: 'relationship-lyra-leosin',
    typeId: 'mentor',
    orientation: 'forward',
    source: { type: 'character', id: 'character-lyra' },
    target: { type: 'npc', id: 'npc-leosin' },
    note: "Lyra studies the Harpers' intelligence craft under Leosin's tutelage.",
    createdAt: '2024-04-05T10:15:00Z'
  }
]

export const seededRelationshipTypes = [
  {
    id: 'sibling',
    name: 'Sibling',
    category: 'Family',
    forwardLabel: 'Sibling of',
    reverseLabel: 'Sibling of',
    allowedSources: ['npc', 'character'],
    allowedTargets: ['npc', 'character']
  },
  {
    id: 'mentor',
    name: 'Mentorship',
    category: 'Guidance',
    forwardLabel: 'Mentor of',
    reverseLabel: 'Mentee of',
    allowedSources: ['npc', 'character'],
    allowedTargets: ['npc', 'character']
  },
  {
    id: 'manager',
    name: 'Reporting line',
    category: 'Organisation',
    forwardLabel: 'Manager of',
    reverseLabel: 'Reports to',
    allowedSources: ['npc', 'character', 'organisation'],
    allowedTargets: ['npc', 'character']
  },
  {
    id: 'member',
    name: 'Organisation membership',
    category: 'Affiliation',
    forwardLabel: 'Member of',
    reverseLabel: 'Roster includes',
    allowedSources: ['npc', 'character'],
    allowedTargets: ['organisation']
  },
  {
    id: 'employer',
    name: 'Employment',
    category: 'Affiliation',
    forwardLabel: 'Employs',
    reverseLabel: 'Employed by',
    allowedSources: ['organisation'],
    allowedTargets: ['npc', 'character']
  },
  {
    id: 'ally',
    name: 'Alliance',
    category: 'Alliance',
    forwardLabel: 'Allied with',
    reverseLabel: 'Allied with',
    allowedSources: ['organisation'],
    allowedTargets: ['organisation']
  },
  {
    id: 'rival',
    name: 'Rivalry',
    category: 'Conflict',
    forwardLabel: 'Rivals',
    reverseLabel: 'Rivals',
    allowedSources: ['organisation'],
    allowedTargets: ['organisation']
  }
]

export const seededRaces = [
  {
    id: 'race-lightfoot-halfling',
    name: 'Lightfoot Halfling',
    description:
      'Lightfoot halflings are nimble and unassuming, easily slipping through crowds or fading from notice.',
    traits: ['Naturally Stealthy', 'Lucky', 'Brave'],
    worldId: 'world-faerun',
    availability: 'Common',
    favoredClasses: ['Bard', 'Rogue'],
    updatedAt: '2024-03-22T12:00:00Z'
  },
  {
    id: 'race-chromatic-dragonborn',
    name: 'Dragonborn (Chromatic)',
    description:
      'Chromatic dragonborn channel the fury of their draconic heritage, commanding elemental breath and resilience.',
    traits: ['Breath Weapon', 'Damage Resistance', 'Intimidating Presence'],
    worldId: 'world-faerun',
    availability: 'Rare',
    favoredClasses: ['Paladin', 'Sorcerer'],
    updatedAt: '2024-04-01T18:30:00Z'
  }
]
