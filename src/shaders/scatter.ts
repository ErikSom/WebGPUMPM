import { coordinateToId, gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const scatterShader = {
  scatter: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
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

      if (SC[index].criteria > 0) {
        SC[i32(SC[index].scan)].compact = f32(index);
      }
    }
  `,
};
