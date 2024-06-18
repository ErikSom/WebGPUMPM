import { coordinateToId, gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const testShader = {
  /* ---------------------------------------------------------------------------- */
  /* ------------------------------------ test ---------------------------------- */
  /* ---------------------------------------------------------------------------- */
  test: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
    ${layout}
    ${particleStruct}
    ${gridStruct}
    ${steamCompStruct}
    ${structLayout(numPArg, numGArg, numGPaddedArg)}
    ${coordinateToId}

    @compute @workgroup_size(1)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
      let index = global_id.x;
      if (index >= u32(${numPArg})) { return; }

      let testVarX = f32(SC[${numGPaddedArg} - 1].criteria);
      let testVarY = f32(SC[${numGPaddedArg} - 1].scan);
      let testVarZ = f32(SC[${numGPaddedArg} - 1].compact);
      let testVarW = f32(SC[${numGPaddedArg} - 1].d);
      let testVec = vec3<f32>(testVarX, testVarW, testVarZ);
      // particles1[index].pos += vec4(testVec * 0.005, 0.0);
      // let test = 1 << 2;
      // test = i32(pow(2, 1));
      let numActiveNodes = i32(SC[${numGPaddedArg} - 1].criteria) + i32(SC[${numGPaddedArg} - 1].scan);
      particles1[index].pos += vec4<f32>(vec3<f32>(0.0, f32(numActiveNodes), 0.0) * 0.00005, 0.0);

      // let indexI = global_id.x;
      // let indexJ = global_id.y;
      // let indexK = global_id.z;
      // if (indexI >= params.nxG || indexJ >= params.nyG || indexK >= params.nzG) { return; }

      // let baseNodeI = i32(indexI);
      // let baseNodeJ = i32(indexJ);
      // let baseNodeK = i32(indexK);
      // let nodeID = coordinateToId(ivec3(baseNodeI, baseNodeJ, baseNodeK));

      // // Atomic Add Float Test
      // if (nodeID < ${numPArg}) {
      //   // particles1[nodeID].pos += vec4<f32>(vec3<f32>(0.0, uintBitsToFloat(gridNodes[33].m), 0.0), 0.0);
      //   particles1[nodeID].pos += vec4<f32>(vec3<f32>(0.0, f32(gridNodes[33].m), 0.0), 0.0);
      //   particles1[nodeID].pos += vec4<f32>(-vec3<f32>(0.0, -8.0 * f32(${numPArg}), 0.0), 0.0);

      //   // particles1[nodeID].pos += vec4<f32>(uintBitsToFloat(gridNodes[33].force), 0.0);
      //   particles1[nodeID].pos += vec4<f32>(gridNodes[33].force, 0.0);
      //   particles1[nodeID].pos += vec4<f32>(-vec3<f32>(-1.0, 2.0, -5.0) * f32(${numPArg}), 0.0);
      // }
    }
  `,
};
