import { gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const p2gShader = {
    p2g: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
    ${layout}
    ${particleStruct}
    ${gridStruct}
    ${steamCompStruct}
    ${structLayout(numPArg, numGArg, numGPaddedArg)}

    fn coordinateToId(x: i32, y: i32, z: i32) -> i32 {
        return x + i32(params.nxG) * y + i32(params.nxG) * i32(params.nyG) * z;
    }

    // Compute weights (when each thread handles a grid node) (Version 1: Tested)
    fn computeWeights1D_G(node: i32, x: f32) -> f32 {
        let d = x - f32(node);
        if (abs(d) < 1.5) {
            if (d >= 0.5 && d < 1.5) {  // [0.5, 1.5)
                return 0.5 * (1.5 - d) * (1.5 - d);
            } else if (d > -0.5 && d < 0.5) { // (-0.5, 0.5)
                return 0.75 - d * d;
            } else {  // (-1.5, -0.5]
                return 0.5 * (1.5 + d) * (1.5 + d);
            }
        } else {
            return 0.0;
        }
    }

    @compute @workgroup_size(4, 4, 4)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let baseNodeI = i32(global_id.x);
        let baseNodeJ = i32(global_id.y);
        let baseNodeK = i32(global_id.z);

        if (baseNodeI >= i32(params.nxG) || baseNodeJ >= i32(params.nyG) || baseNodeK >= i32(params.nzG)) {
            return;
        }

        var m: f32 = 0.0;
        var v: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
        let minCorner = vec3<f32>(params.minCornerX, params.minCornerY, params.minCornerZ);

        for (var p: i32 = 0; p < ${numPArg}; p++) {
            let posP_index_space = (particles1[p].pos.xyz - minCorner) / params.h;

            let wI = computeWeights1D_G(baseNodeI, posP_index_space.x);
            let wJ = computeWeights1D_G(baseNodeJ, posP_index_space.y);
            let wK = computeWeights1D_G(baseNodeK, posP_index_space.z);

            let weight = wI * wJ * wK * particles1[p].v.w;
            m += weight;
            v += weight * particles1[p].v.xyz; // not APIC
            // v += weight * (particles1[p].v.xyz + particles2[p].C * (posG - particles1[p].pos.xyz)); // APIC
        }

        let nodeID = coordinateToId(baseNodeI, baseNodeJ, baseNodeK);
        gridNodes[nodeID].m = m;
        gridNodes[nodeID].v = v / (m + 0.0000000001); // constant to handle division by 0
    }
`,
};
