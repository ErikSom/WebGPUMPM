import { gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const g2pShader = {
    /* -------------Example For Adding "Kernel"/Compute Shader (Part 3)------------------- */
    g2p: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
    ${layout}
    ${particleStruct}
    ${gridStruct}
    ${steamCompStruct}
    ${structLayout(numPArg, numGArg, numGPaddedArg)}

    fn computeWeights1D_P(x: f32, w: ptr<function, array<f32, 3>>, dw: ptr<function, array<f32, 3>>) -> i32 {
        var baseNode = i32(floor(x - 0.5));
        let d0 = x - f32(baseNode);
        (*w)[0] = 0.5 * (1.5 - d0) * (1.5 - d0);
        (*dw)[0] = d0 - 1.5;
        let d1 = x - f32(baseNode + 1);
        (*w)[1] = 0.75 - d1 * d1;
        (*dw)[1] = -2.0 * d1;
        let d2 = x - f32(baseNode + 2);
        (*w)[2] = 0.5 * (1.5 + d2) * (1.5 + d2);
        (*dw)[2] = 1.5 + d2;
        return baseNode;
    }

    fn coordinateToId(c: vec3<i32>) -> i32 {
        return c.x + i32(params.nxG) * c.y + i32(params.nxG) * i32(params.nyG) * c.z;
    }

    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index >= u32(${numPArg})) {
            return;
        }
        // loop through the nearby 3*3*3 grids
        let minCorner = vec3<f32>(params.minCornerX, params.minCornerY, params.minCornerZ);
        let posP_index_space = (particles1[index].pos.xyz - minCorner) / params.h;
        var wI: array<f32, 3>;
        var wJ: array<f32, 3>;
        var wK: array<f32, 3>;
        var dwI: array<f32, 3>;
        var dwJ: array<f32, 3>;
        var dwK: array<f32, 3>;

        let baseNodeI = computeWeights1D_P(posP_index_space.x, &wI, &dwI);
        let baseNodeJ = computeWeights1D_P(posP_index_space.y, &wJ, &dwJ);
        let baseNodeK = computeWeights1D_P(posP_index_space.z, &wK, &dwK);
        
        var vP_PIC = vec3<f32>(0.0, 0.0, 0.0);
        var vP_FLIP = particles1[index].v.xyz;
        var CMat = mat3x3<f32>(
            vec3<f32>(0.0, 0.0, 0.0),
            vec3<f32>(0.0, 0.0, 0.0),
            vec3<f32>(0.0, 0.0, 0.0)
        );
        
        for (var k = 0; k < 3; k++) {
            for (var j = 0; j < 3; j++) {
                for (var i = 0; i < 3; i++) {
                    let nodeI = baseNodeI + i;
                    let nodeJ = baseNodeJ + j;
                    let nodeK = baseNodeK + k;
                    let nodeID = coordinateToId(vec3<i32>(nodeI, nodeJ, nodeK));
                    let weightIJK = wI[i] * wJ[j] * wK[k];
                    
                    vP_PIC += gridNodes[nodeID].vN * weightIJK;
                    // if not APIC:
                    vP_FLIP += (gridNodes[nodeID].vN - gridNodes[nodeID].v) * weightIJK;
                    // // if APIC: ignore at the moment -- below is APIC stuff
                    // let posG = vec3<f32>(f32(nodeI), f32(nodeJ), f32(nodeK)) * params.h + minCorner;
                    // CMat += (weightIJK * 4.0 / (params.h * params.h)) * outer_product(gridNodes[nodeID].vN, (posG - particles1[index].pos.xyz));
                }
            }
        }
        
        // if not APIC:
        let flipPercentage = 0.95;
        particles1[index].v = vec4(
            (1.0 - flipPercentage) * vP_PIC + flipPercentage * vP_FLIP,
            particles1[index].v.w
        );
        // // if APIC: ignore apic for now -- below is APIC code
        // particles1[index].v.xyz = vP_PIC.xyz;
        // particles2[index].C = CMat;

        // Remember to use PIC for position update
        particles1[index].pos = vec4(
            particles1[index].pos.xyz + params.dt * vP_PIC,
            particles1[index].pos.w
        );
    }
`,
};
