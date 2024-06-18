import { coordinateToId, gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const updateGridVelocityShader = {

/* ---------------------------------------------------------------------------- */
/* ----------------------------- updateGridVelocity --------------------------- */
/* ---------------------------------------------------------------------------- */
  updateGridVelocity: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
    ${layout}
    ${particleStruct}
    ${gridStruct}
    ${steamCompStruct}
    ${structLayout(numPArg, numGArg, numGPaddedArg)}
    ${coordinateToId}

    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
        let index = global_id.x;
        let numActiveNodes = i32(SC[${numGPaddedArg} - 1].criteria) + i32(SC[${numGPaddedArg} - 1].scan);
        if (i32(index) >= numActiveNodes) {
            return;
        }

        let nodeID = i32(SC[index].compact);

        // Updating Velocity Stored On Grid Nodes
        // if (gridNodes[nodeID].m != 0) {
        gridNodes[nodeID].vN = gridNodes[nodeID].v + params.dt * gridNodes[nodeID].force / gridNodes[nodeID].m;
        // }
    }
  `,
};
