import { coordinateToId, gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const downSweepShader = {
  downSweep: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
    ${layout}
    ${particleStruct}
    ${gridStruct}
    ${steamCompStruct}
    ${structLayout(numPArg, numGArg, numGPaddedArg)}
    ${coordinateToId}

    @compute @workgroup_size(1)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
      let index = global_id.x;
      if (index >= u32(${numGPaddedArg})) { return; }

      let d: u32 = u32(SC[index].d);

      if ((index % (1u << (d + 1u))) == 0u) {
        let t = SC[index + (1u << d) - 1u].scan;
        SC[index + (1u << d) - 1u].scan = SC[index + (1u << (d + 1u)) - 1u].scan;
        SC[index + (1u << (d + 1u)) - 1u].scan += t;
      }

      // Decrement d by 1
      SC[index].d -= 1.0;
    }
  `,
};
