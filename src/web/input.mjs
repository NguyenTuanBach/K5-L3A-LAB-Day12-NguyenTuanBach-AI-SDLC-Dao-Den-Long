// The camera looks toward +Z at yaw=0, so screen-right is world -X.
// Keep the CLI/core contract (+X for input x=+1); adapt keyboard axes here.
import { DEFAULT_BINDINGS } from './keymap.mjs';
export function keyboardInput(keys, yaw, bindings = DEFAULT_BINDINGS) {
  const down = action => bindings[action].some(code => keys.has(code));
  return {
    move: [(down('left') ? 1 : 0) - (down('right') ? 1 : 0), (down('up') ? 1 : 0) - (down('down') ? 1 : 0)],
    cam_yaw_deg: yaw,
    jump: down('jump'), interact: down('interact'), pulse: down('pulse'), dash: down('dash'),
  };
}
