export const enum ServerProt {
    // interfaces
    IF_OPENCHAT = 208,
    IF_OPENMAIN_SIDE = 84,
    IF_CLOSE = 180,
    IF_SETICON = 140,
    IF_SHOWICON = 6,
    IF_OPENMAIN = 118,
    IF_OPENSIDE = 237,
    IF_OPENOVERLAY = 56,
    IF_OPENFULL = 195,
    IF_SETANGLE = 142,
    IF_SETROTATESPEED = 117,

    // updating interfaces
    IF_SETCOLOUR = 231,
    IF_SETHIDE = 115,
    IF_SETOBJECT = 120,
    IF_SETMODEL = 250,
    IF_SETANIM = 24,
    IF_SETPLAYERHEAD = 210,
    IF_SETTEXT = 110,
    IF_SETNPCHEAD = 160,
    IF_SETPOSITION = 3,
    IF_SETSCROLLPOS = 182,

    // tutorial area
    TUT_FLASH = 88,
    TUT_OPEN = 185,

    // inventory
    UPDATE_INV_STOP_TRANSMIT = 174,
    UPDATE_INV_FULL = 12,
    UPDATE_INV_PARTIAL = 214,

    // camera control
    CAM_LOOKAT = 234,
    CAM_SHAKE = 255,
    CAM_MOVETO = 253,
    CAM_RESET = 7,

    // entity updates
    NPC_INFO = 128,
    PLAYER_INFO = 92,

    // social
    FRIENDLIST_LOADED = 70,
    MESSAGE_GAME = 82,
    UPDATE_IGNORELIST = 211,
    CHAT_FILTER_SETTINGS = 196,
    MESSAGE_PRIVATE = 51,
    MESSAGE_PRIVATE_ECHO = 71,
    UPDATE_FRIENDLIST = 156,

    // misc
    UNSET_MAP_FLAG = 233,
    UPDATE_RUNWEIGHT = 171,
    HINT_ARROW = 186,
    UPDATE_REBOOT_TIMER = 116,
    UPDATE_STAT = 34,
    UPDATE_RUNENERGY = 18,
    RESET_ANIMS = 27,
    LAST_LOGIN_INFO = 58,
    LOGOUT = 181,
    P_COUNTDIALOG = 132,
    P_NAMEDIALOG = 124,
    SET_MULTIWAY = 48,
    SET_PLAYER_OP = 223,
    MINIMAP_TOGGLE = 235,
    TELEPORT = 129,
    IF_SETREPORTABUSE = 130,
    REFLECTION_CHECKER = 240,

    // maps
    REBUILD_NORMAL = 166,
    REBUILD_REGION = 23,

    // vars
    VARP_SMALL = 222,
    VARP_LARGE = 2,
    VARP_SYNC = 72,
    VARP_RESET = 14,

    // audio
    SYNTH_SOUND = 131,
    MIDI_SONG = 217,
    MIDI_JINGLE = 40,

    // zones
    UPDATE_ZONE_PARTIAL_FOLLOWS = 254,
    UPDATE_ZONE_FULL_FOLLOWS = 64,
    UPDATE_ZONE_PARTIAL_ENCLOSED = 63,

    // zone protocol
    P_LOCMERGE = 229,
    LOC_ANIM = 49,
    OBJ_DEL = 74,
    OBJ_REVEAL = 19,
    LOC_ADD_CHANGE = 241,
    MAP_PROJANIM = 1,
    LOC_DEL = 143,
    OBJ_COUNT = 99,
    MAP_ANIM = 202,
    OBJ_ADD = 175,
    SOUND_AREA = 9
}

export const RuneJsServerProt = process.env.RUNEJS_SERVER_PROT === 'true';
export const RuneJsCustomCol = process.env.RUNEJS_CUSTOM_COL === 'true';

// prettier-ignore
const DefaultServerProtSizes = [
    0, 15, 6, 8, 0, 0, 1, 0, 0, 5,
    0, 0, -2, 0, 0, 0, 0, 0, 1, 7,
    0, 0, 0, -2, 6, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 6, 0, 0, 0, 0, 0,
    5, 0, 0, 0, 0, 0, 0, 0, 1, 4,
    0, -1, 0, 0, 0, 0, 2, 0, 4, 0,
    0, 0, 0, -2, 2, 0, 0, 0, 0, 0,
    1, -1, 0, 0, 3, 0, 0, 0, 0, 0,
    0, 0, -1, 0, 4, 0, 0, 0, 1, 0,
    0, 0, -2, 0, 0, 0, 0, 0, 0, 7,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    -2, 0, 0, 0, 0, 5, 2, 8, 2, 0,
    8, 0, 0, 0, 0, 0, 0, 0, -2, 3,
    2, 5, 0, 0, 0, 0, 0, 0, 0, 0,
    3, 0, 10, 2, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 10, 0, 0, 0,
    6, 0, 0, 0, 0, 0, -2, 0, 0, 0,
    0, 2, 0, 0, 4, 5, 0, 0, 0, 0,
    0, 0, 6, 0, 0, 2, 6, 0, 0, 0,
    0, 0, 0, 0, 6, 4, 3, 0, 0, 0,
    0, 0, 6, 0, 0, 0, 0, 0, 2, 0,
    4, -2, 0, 0, -2, 0, 0, 2, 0, 0,
    0, 0, 3, -1, 0, 0, 0, 0, 0, 14,
    0, 6, 0, 0, 6, 1, 0, 2, 0, 0,
    -2, 4, 0, 0, 0, 0, 0, 0, 0, 0,
    6, 0, 0, 6, 2, 4
];

// RuneJS uses the same packet ids as the 435 client for the packets below, but
// a few payload lengths differ because its encoders write 32-bit component ids
// and keep some extra server-only console packets.
export const ServerProtSizes = RuneJsServerProt ? [
    ...DefaultServerProtSizes.slice(0, 21),
    6,
    ...DefaultServerProtSizes.slice(22, 83),
    -1,
    DefaultServerProtSizes[84],
    -1,
    ...DefaultServerProtSizes.slice(86)
] : DefaultServerProtSizes;
