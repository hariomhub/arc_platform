/**
 * layout.js - the geometry of the stage, shared by the shell, the sets and the stage component.
 *
 * The set is 800 x 400. The board the robot explains sits on a screen in the middle; the robot stands beside it, on a
 * pad at the left or at the right, and walks across the floor in front when the next point is on the other side. At
 * rest it stands over the screen's empty margin, never over the board's own content.
 *
 * The engine's walking distances (`walkTo`) and `bot.x` are offsets from ROBOT_X, in set units. The robot is kept well
 * inside the stage on both sides (its arms reach about 80 units either way when it cheers, and it parks 108 from the
 * edge), so nothing is cut off.
 */
export const SCENE_W = 800;
export const SCENE_H = 400;

export const ROBOT_X = 400;          // the reference position: the middle of the stage
export const LEFT_X = 108;            // where the robot parks on the left and on the right
export const RIGHT_X = 692;
export const FEET_Y = 360;
export const ROBOT_SIZE = 0.66;      // the robot's height as a fraction of the stage's height

// the screen the board is drawn on; the board's own content sits inset from its edges
export const SCREEN = { x: 112, y: 16, w: 576, h: 330 };
// The sets were drawn for a screen whose content is 492 wide, centred on (538, 180). They are drawn a little smaller and
// centred on the stage, which keeps their edges clear of the robot standing at either side.
export const BOARD_SCALE = 0.95;
const BOARD_CENTRE = { x: 538, y: 180 };
export const boardToStage = (x, y) => ({ x: ROBOT_X + (x - BOARD_CENTRE.x) * BOARD_SCALE, y: BOARD_CENTRE.y + (y - BOARD_CENTRE.y) * BOARD_SCALE });
export const BOARD_TRANSFORM = `translate(${ROBOT_X} ${BOARD_CENTRE.y}) scale(${BOARD_SCALE}) translate(${-BOARD_CENTRE.x} ${-BOARD_CENTRE.y})`;

// Rough positions of the robot's body parts, used to start beams and thrown objects where they belong.
export const HEAD_Y = 125;
export const SHOULDER_DX = 44;       // the shoulders are this far either side of its centre
export const SHOULDER_Y = 191;
export const ARM = 72;               // shoulder to hand
export const HAND_REST_Y = 214;      // height of its hands when they meet to hold something
export const HAND_REST_DX = 20;      // and how far in front of its centre, towards the board
