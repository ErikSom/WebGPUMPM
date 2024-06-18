import { coordinateToId, gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const clearGridDataShader = {
  clearGridData: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
    ${layout}
    ${particleStruct}
    ${gridStruct}
    ${steamCompStruct}
    ${structLayout(numPArg, numGArg, numGPaddedArg)}
    ${coordinateToId}

    @compute @workgroup_size(4, 4, 4)
    fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
        let indexI = global_id.x;
        let indexJ = global_id.y;
        let indexK = global_id.z;

        if (indexI >= u32(params.nxG) || indexJ >= u32(params.nyG) || indexK >= u32(params.nzG)) { 
            return;
        }

        let baseNodeI = i32(indexI);
        let baseNodeJ = i32(indexJ);
        let baseNodeK = i32(indexK);
        let nodeID = coordinateToId(vec3<i32>(baseNodeI, baseNodeJ, baseNodeK));

        // Clearing Data Stored On Grid Nodes
        gridNodes[nodeID].m = 0.0;
        gridNodes[nodeID].vN = vec3<f32>(0.0, 0.0, 0.0);
        gridNodes[nodeID].v = vec3<f32>(0.0, 0.0, 0.0);
        gridNodes[nodeID].force = vec3<f32>(0.0, 0.0, 0.0);

        // Test Speed
        // if (nodeID < ${numPArg}) {
        //   particles1[nodeID].pos = particles1[nodeID].pos + vec4<f32>(vec3<f32>(0.0, 0.01, 0.0), 0.0);
        // }
    }
  `,
};
