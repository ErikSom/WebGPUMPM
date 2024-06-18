import { coordinateToId, gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const setRootToZeroShader = {
  setRootToZero: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
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

      if (index == u32(${numGPaddedArg} - 1)) {
        SC[index].scan = 0.0;
      }
      SC[index].d -= 1.0;
    }
  `,
};
