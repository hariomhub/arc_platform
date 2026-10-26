/**
 * finishes.js - the colourways of the robot family. One shape, five finishes.
 *   shell    four stops from the lit side to the shaded side of the body
 *   shade    the colour used for shadows and seams on that shell
 *   belly    the lighter belly panel
 *   accent   the glow of the eyes, chest light and ear rings; accent2 is its bright centre
 * Every robot also carries the same warm orange trim (feet, knee guards, grippers): see three/model.js.
 */
export const FINISHES = {
    sky: {
        shell: ['#F1F8FF', '#BFDCFB', '#80B0E8', '#4C79B4'], shade: '#27497A', belly: '#F7FBFF',
        accent: '#58C8F5', accent2: '#E3F6FF', glow: '#60A5FA',
    },
    lavender: {
        shell: ['#F8F3FF', '#D8C9F8', '#A98DE6', '#6F55B8'], shade: '#3F2D7A', belly: '#FBF8FF',
        accent: '#D68BFF', accent2: '#F7E4FF', glow: '#C4B5FD',
    },
    graphite: {
        shell: ['#9AA5B6', '#667286', '#404A59', '#222934'], shade: '#10151C', belly: '#7B879A',
        accent: '#FFB62E', accent2: '#FFF0C7', glow: '#FBBF24',
    },
    cream: {
        shell: ['#FFFCF3', '#F8E8C6', '#E6CB93', '#C5A25F'], shade: '#7D6330', belly: '#FFFEFA',
        accent: '#FF9F1C', accent2: '#FFF1D1', glow: '#FCD34D',
    },
    aurora: {
        shell: ['#F1F5FF', '#C9D3F9', '#98A7EA', '#6670C6'], shade: '#343C8F', belly: '#F8FAFF',
        accent: '#4FE3C8', accent2: '#DDFFF7', glow: '#5EEAD4',
    },
};

export const TRIM = ['#FFE79A', '#FFC445', '#E58E12'];   // gold: lit, mid, shade
