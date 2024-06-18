import { gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const exampleShaders = {
  compute: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
  ${layout}
  ${particleStruct}
  ${gridStruct}
  ${steamCompStruct}
  ${structLayout(numPArg, numGArg, numGPaddedArg)}

  @compute @workgroup_size(64, 1, 1)
  fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
    let index = global_id.x;
    if (index >= ${numPArg}) { return; }

    let dY = gridNodes[30].v * 0.1;
    let dY2 = gridNodes[30].m * 0.1;
    let dY3 = particles2[index].C[2] * 0.01;
    particles1[index].pos += vec4(dY3, 0.0);
  }`,
};
