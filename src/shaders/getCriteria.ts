import { coordinateToId, gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const getCriteriaShader = {
  getCriteria: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
    ${layout}
    ${particleStruct}
    ${gridStruct}
    ${steamCompStruct}
    ${structLayout(numPArg, numGArg, numGPaddedArg)}
    ${coordinateToId}

    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
      let index = global_id.x;
      if (index >= u32(${numGArg})) { return; }

      var result: i32 = 0;
      if (gridNodes[index].m > 0.0) {
        result = 1;
      } else {
        result = 0;
      }

      SC[index].criteria = f32(result);
      SC[index].scan = f32(result);
    }
  `,
};
