import { coordinateToId, gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const setBoundaryVelocitiesShader = {

/* ---------------------------------------------------------------------------- */
/* ----------------------------- setBoundaryVelocities ------------------------ */
/* ---------------------------------------------------------------------------- */
  setBoundaryVelocities: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
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
        // Setting Boundary Velocities To Zero
        let thickness = 3;  // Change the thickness parameter here
        // Bottom (non-sticky)
        if (baseNodeJ < thickness) {
            gridNodes[nodeID].vN.y = 0.0;
        }
        // Left (non-sticky)
        if (baseNodeI < thickness) {
            gridNodes[nodeID].vN.x = 0.0;
        }
        // Right (non-sticky)
        if (baseNodeI >= i32(params.nxG) - thickness) {
            gridNodes[nodeID].vN.x = 0.0;
        }
        // Back (non-sticky)
        if (baseNodeK < thickness) {
            gridNodes[nodeID].vN.z = 0.0;
        }
        // Front (non-sticky)
        if (baseNodeK >= i32(params.nzG) - thickness) {
            gridNodes[nodeID].vN.z = 0.0;
        }
        // Top (sticky)
        if (baseNodeJ >= i32(params.nyG) - thickness) {
            gridNodes[nodeID].vN = vec3<f32>(0.0, 0.0, 0.0);
        }
        // // Test Speed
        // if (nodeID < ${numPArg}) {
        //   particles1[nodeID].pos += vec4<f32>(vec3<f32>(0.0, 0.01, 0.0), 0.0);
        // }
    }
  `,
};
