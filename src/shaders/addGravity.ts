import { coordinateToId, gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const addGravityShader = {
    addGravity: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
    ${layout}
    ${particleStruct}
    ${gridStruct}
    ${steamCompStruct}
    ${structLayout(numPArg, numGArg, numGPaddedArg)}
    ${coordinateToId}

    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
        let index = global_id.x;
        let numActiveNodes = i32(SC[${numGPaddedArg} - 1].criteria + SC[${numGPaddedArg} - 1].scan);
        if (i32(index) >= numActiveNodes) { return; }

        let nodeID = i32(SC[index].compact);
        /* ------------------------------------------------------------------------- */
        // Note: The mass division part from p2g
        /* ------------------------------------------------------------------------- */
        gridNodes[nodeID].v = gridNodes[nodeID].v / gridNodes[nodeID].m;

        // Adding Gravity Force
        let gravity = vec3<f32>(params.gravityX, params.gravityY, params.gravityZ);
        gridNodes[nodeID].force = gridNodes[nodeID].force + gridNodes[nodeID].m * gravity;
    }
  `,
};
