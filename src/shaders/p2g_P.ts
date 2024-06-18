import { coordinateToId, gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const p2g_PShader = {
  p2g_P: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
  ${layout}
  ${particleStruct}

  struct GridNodeStruct {
    vN_x: atomic<u32>,  // New Velocity Stored On The Grid Node
    vN_y: atomic<u32>,  // New Velocity Stored On The Grid Node
    vN_z: atomic<u32>,  // New Velocity Stored On The Grid Node
    v_x: atomic<u32>,   // Old Velocity Stored On The Grid Node
    v_y: atomic<u32>,   // Old Velocity Stored On The Grid Node
    v_z: atomic<u32>,   // Old Velocity Stored On The Grid Node
    force_x: atomic<u32>, // Force Stored On The Grid Node
    force_y: atomic<u32>, // Force Stored On The Grid Node
    force_z: atomic<u32>, // Force Stored On The Grid Node
    m: atomic<u32>,      // Mass Stored On The Grid Node
    PADDING_1: f32,      // (IGNORE)
    PADDING_2: f32,      // (IGNORE)
    PADDING_3: f32,      // (IGNORE)
  };

  ${steamCompStruct}
  ${structLayout(numPArg, numGArg, numGPaddedArg)}
  ${coordinateToId}

  const GAMMA = 5.8284271247;
  const C_STAR = 0.9238795325;
  const S_STAR = 0.3826834323;
  const SVD_EPS = 0.0000001;

  struct Weights1D {
    w: array<f32, 3>,
    dw: array<f32, 3>,
    baseNode: i32
  };

  fn computeWeights1D_P(x: f32) -> Weights1D {
      var w: array<f32, 3>;
      var dw: array<f32, 3>;
      var baseNode: i32 = i32(floor(x - 0.5));
      let d0: f32 = x - f32(baseNode);
      w[0] = 0.5 * (1.5 - d0) * (1.5 - d0);
      dw[0] = d0 - 1.5;
      let d1: f32 = x - f32(baseNode + 1);
      w[1] = 0.75 - d1 * d1;
      dw[1] = -2.0 * d1;
      let d2: f32 = x - f32(baseNode + 2);
      w[2] = 0.5 * (1.5 + d2) * (1.5 + d2);
      dw[2] = 1.5 + d2;
      return Weights1D(w, dw, baseNode);
  }

  fn floatBitsToUint(value: f32) -> u32 {
    return bitcast<u32>(value);
  }

  fn uintBitsToFloat(value: u32) -> f32 {
      return bitcast<f32>(value);
  }

  fn atomicAddFloat(atomicVar: ptr<storage, atomic<u32>, read_write>, val: f32) {
    var old = atomicLoad(atomicVar);
    var assumed: u32;
    loop {
      assumed = old;
      old = atomicCompareExchangeWeak(atomicVar, assumed, floatBitsToUint(uintBitsToFloat(assumed) + val)).old_value;
      if (assumed == old) {
        break;
      }
    }
  }

  @compute @workgroup_size(64) // Adjust workgroup size to balance workload
  fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x + global_id.y * ${numPArg};
    if (index >= u32(${numPArg})) { return; }

    let minCorner = vec3<f32>(params.minCornerX, params.minCornerY, params.minCornerZ);
    let posP_index_space = (particles1[index].pos.xyz - minCorner) / params.h;

    let weightsI: Weights1D = computeWeights1D_P(posP_index_space.x);
    let weightsJ: Weights1D = computeWeights1D_P(posP_index_space.y);
    let weightsK: Weights1D = computeWeights1D_P(posP_index_space.z);

    let wI = weightsI.w;
    let dwI = weightsI.dw;
    let baseNodeI = weightsI.baseNode;

    let wJ = weightsJ.w;
    let dwJ = weightsJ.dw;
    let baseNodeJ = weightsJ.baseNode;

    let wK = weightsK.w;
    let dwK = weightsK.dw;
    let baseNodeK = weightsK.baseNode;

    for (var k = 0; k < 3; k++) {
      for (var j = 0; j < 3; j++) {
        for (var i = 0; i < 3; i++) {
          let nodeI = baseNodeI + i;
          let nodeJ = baseNodeJ + j;
          let nodeK = baseNodeK + k;
          let nodeID = coordinateToId(vec3<i32>(nodeI, nodeJ, nodeK));
          let weightIJK = wI[i] * wJ[j] * wK[k];

          let mP = particles1[index].v.w;
          let vP = particles1[index].v.xyz;
          // Splat Mass
          let massSplat = mP * weightIJK;
          atomicAddFloat(&gridNodes[nodeID].m, massSplat);

          // Splat Momentum
          let momentumSplat = massSplat * vP;
          atomicAddFloat(&gridNodes[nodeID].vN_x, momentumSplat.x);
          atomicAddFloat(&gridNodes[nodeID].vN_y, momentumSplat.y);
          atomicAddFloat(&gridNodes[nodeID].vN_z, momentumSplat.z);
        }
      }
    }
  }
`,
};
