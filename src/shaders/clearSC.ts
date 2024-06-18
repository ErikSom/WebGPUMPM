import { coordinateToId, gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const clearSCShader = {
  clearSC: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
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

      SC[index].criteria = 0;  // Clear criteria buffer
      SC[index].scan = 0;  // Clear scan buffer
      SC[index].compact = 0;  // Clear compact buffer
      SC[index].d = 0;  // Clear d buffer
    }
  `,
};
