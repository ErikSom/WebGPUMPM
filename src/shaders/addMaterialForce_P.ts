import { coordinateToId, gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const addMaterialForce_PShader = {
  addMaterialForce_P: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
  ${layout}
  ${particleStruct}

  struct GridNodeStruct {
    vN_x: atomic<u32>,
    vN_y: atomic<u32>,
    vN_z: atomic<u32>,
    v_x: atomic<u32>,
    v_y: atomic<u32>,
    v_z: atomic<u32>,
    force_x: atomic<u32>,
    force_y: atomic<u32>,
    force_z: atomic<u32>,
    m: atomic<u32>,
    PADDING_1: f32, 
    PADDING_2: f32, 
    PADDING_3: f32, 
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

  struct Weights1D_G {
    w: f32,
    dw: f32,
  };

  fn computeWeights1D_G(node: i32, x: f32) -> Weights1D_G {
    let d = x - f32(node);
    var w: f32;
    var dw: f32;
    if (abs(d) < 1.5) {
      if (d >= 0.5 && d < 1.5) {
        w = 0.5 * (1.5 - d) * (1.5 - d);
        dw = d - 1.5;
      } else if (d > -0.5 && d < 0.5) {
        w = 0.75 - d * d;
        dw = -2.0 * d;
      } else {
        w = 0.5 * (1.5 + d) * (1.5 + d);
        dw = 1.5 + d;
      }
    } else {
      w = 0.0;
      dw = 0.0;
    }
    return Weights1D_G(w, dw);
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

  fn atomicAddVec3(x: ptr<storage, atomic<u32>, read_write>, y: ptr<storage, atomic<u32>, read_write>, z: ptr<storage, atomic<u32>, read_write>, val: vec3<f32>) {
    atomicAddFloat(x, val.x);
    atomicAddFloat(y, val.y);
    atomicAddFloat(z, val.z);
  }

  fn approx_givens_quat(s_pp: f32, s_pq: f32, s_qq: f32) -> vec2<f32> {
    let c_h = 2.0 * (s_pp - s_qq);
    let s_h2 = s_pq * s_pq;
    let c_h2 = c_h * c_h;
    if (GAMMA * s_h2 < c_h2) {
      let omega = 1.0 / sqrt(s_h2 + c_h2);
      return vec2<f32>(omega * c_h, omega * s_pq);
    }
    return vec2<f32>(C_STAR, S_STAR);
  }

  fn quat_to_mat3(quat: vec4<f32>) -> mat3x3<f32> {
    let qx2 = quat.y * quat.y;
    let qy2 = quat.z * quat.z;
    let qz2 = quat.w * quat.w;
    let qwqx = quat.x * quat.y;
    let qwqy = quat.x * quat.z;
    let qwqz = quat.x * quat.w;
    let qxqy = quat.y * quat.z;
    let qxqz = quat.y * quat.w;
    let qyqz = quat.z * quat.w;
    return mat3x3<f32>(
      1.0 - 2.0 * (qy2 + qz2), 2.0 * (qxqy + qwqz), 2.0 * (qxqz - qwqy),
      2.0 * (qxqy - qwqz), 1.0 - 2.0 * (qx2 + qz2), 2.0 * (qyqz + qwqx),
      2.0 * (qxqz + qwqy), 2.0 * (qyqz - qwqx), 1.0 - 2.0 * (qx2 + qy2)
    );
  }

  fn symmetric_eigenanalysis(A: mat3x3<f32>) -> mat3x3<f32> {
    var S = transpose(A) * A;
    var q = mat3x3<f32>(
      vec3<f32>(1.0, 1.0, 1.0),
      vec3<f32>(1.0, 1.0, 1.0),
      vec3<f32>(1.0, 1.0, 1.0)
    );
    for (var i = 0; i < 5; i++) {
      var ch_sh = approx_givens_quat(S[0][0], S[0][1], S[1][1]);
      var ch_sh_quat = vec4<f32>(ch_sh.x, 0.0, 0.0, ch_sh.y);
      var q_mat = quat_to_mat3(ch_sh_quat);
      S = transpose(q_mat) * S * q_mat;
      q = q * q_mat;
      ch_sh = approx_givens_quat(S[0][0], S[0][2], S[2][2]);
      ch_sh_quat = vec4<f32>(ch_sh.x, 0.0, -ch_sh.y, 0.0);
      q_mat = quat_to_mat3(ch_sh_quat);
      S = transpose(q_mat) * S * q_mat;
      q = q * q_mat;
      ch_sh = approx_givens_quat(S[1][1], S[1][2], S[2][2]);
      ch_sh_quat = vec4<f32>(ch_sh.x, ch_sh.y, 0.0, 0.0);
      q_mat = quat_to_mat3(ch_sh_quat);
      S = transpose(q_mat) * S * q_mat;
      q = q * q_mat;
    }
    return q;
  }

  fn approx_qr_givens_quat(a0: f32, a1: f32) -> vec2<f32> {
    let rho = sqrt(a0 * a0 + a1 * a1);
    var s_h = a1;
    var max_rho_eps = rho;
    if (rho <= SVD_EPS) {
      s_h = 0.0;
      max_rho_eps = SVD_EPS;
    }
    var c_h = max_rho_eps + a0;
    if (a0 < 0.0) {
      let temp = c_h - 2.0 * a0;
      c_h = s_h;
      s_h = temp;
    }
    let omega = 1.0 / sqrt(c_h * c_h + s_h * s_h);
    return vec2<f32>(omega * c_h, omega * s_h);
  }

  struct QR_mats {
    Q: mat3x3<f32>,
    R: mat3x3<f32>,
  }

  fn qr_decomp(B: mat3x3<f32>) -> QR_mats {
    var qr_decomp_result: QR_mats;
    var R: mat3x3<f32>;
    let ch_sh10 = approx_qr_givens_quat(B[0][0], B[0][1]);
    let Q10 = quat_to_mat3(vec4<f32>(ch_sh10.x, 0.0, 0.0, ch_sh10.y));
    R = transpose(Q10) * B;
    let ch_sh20 = approx_qr_givens_quat(R[0][0], R[0][2]);
    let Q20 = quat_to_mat3(vec4<f32>(ch_sh20.x, 0.0, -ch_sh20.y, 0.0));
    R = transpose(Q20) * R;
    let ch_sh21 = approx_qr_givens_quat(R[1][1], R[1][2]);
    let Q21 = quat_to_mat3(vec4<f32>(ch_sh21.x, ch_sh21.y, 0.0, 0.0));
    R = transpose(Q21) * R;
    qr_decomp_result.R = R;
    qr_decomp_result.Q = Q10 * Q20 * Q21;
    return qr_decomp_result;
  }

  struct SVD_mats {
    U: mat3x3<f32>,
    Sigma: mat3x3<f32>,
    V: mat3x3<f32>,
  }

  fn svd(A: mat3x3<f32>) -> SVD_mats {
    var svd_result: SVD_mats;
    svd_result.V = symmetric_eigenanalysis(A);
    var B = A * svd_result.V;
    var rho0 = dot(B[0], B[0]);
    var rho1 = dot(B[1], B[1]);
    var rho2 = dot(B[2], B[2]);
    if (rho0 < rho1) {
      var temp = B[1];
      B[1] = -B[0];
      B[0] = temp;
      temp = svd_result.V[1];
      svd_result.V[1] = -svd_result.V[0];
      svd_result.V[0] = temp;
      var temp_rho = rho0;
      rho0 = rho1;
      rho1 = temp_rho;
    }
    if (rho0 < rho2) {
      var temp = B[2];
      B[2] = -B[0];
      B[0] = temp;
      temp = svd_result.V[2];
      svd_result.V[2] = -svd_result.V[0];
      svd_result.V[0] = temp;
      rho2 = rho0;
    }
    if (rho1 < rho2) {
      var temp = B[2];
      B[2] = -B[1];
      B[1] = temp;
      temp = svd_result.V[2];
      svd_result.V[2] = -svd_result.V[1];
      svd_result.V[1] = temp;
    }
    let QR = qr_decomp(B);
    svd_result.U = QR.Q;
    svd_result.Sigma = QR.R;
    return svd_result;
  }

  fn fixedCorotated(F: mat3x3<f32>) -> mat3x3<f32> {
    let F_SVD = svd(F);
    let R = F_SVD.U * transpose(F_SVD.V);
    let J = determinant(F);
    var dJdF: mat3x3<f32>;
    dJdF[0][0] = F[1][1] * F[2][2] - F[1][2] * F[2][1];
    dJdF[1][0] = F[0][2] * F[2][1] - F[0][1] * F[2][2];
    dJdF[2][0] = F[0][1] * F[1][2] - F[0][2] * F[1][1];
    dJdF[0][1] = F[1][2] * F[2][0] - F[1][0] * F[2][2];
    dJdF[1][1] = F[0][0] * F[2][2] - F[0][2] * F[2][0];
    dJdF[2][1] = F[0][2] * F[1][0] - F[0][0] * F[1][2];
    dJdF[0][2] = F[1][0] * F[2][1] - F[1][1] * F[2][0];
    dJdF[1][2] = F[0][1] * F[2][0] - F[0][0] * F[2][1];
    dJdF[2][2] = F[0][0] * F[1][1] - F[0][1] * F[1][0];
    return 2.0 * params.mu * (F - R) + params.lambda * (J - 1.0) * dJdF;
  }

  fn fixedCorotatedSnow(Fe: mat3x3<f32>, Fp: mat3x3<f32>) -> mat3x3<f32> {
    let Fe_SVD = svd(Fe);
    let R = Fe_SVD.U * transpose(Fe_SVD.V);
    let Je = determinant(Fe);
    var dJedFe: mat3x3<f32>;
    dJedFe[0][0] = Fe[1][1] * Fe[2][2] - Fe[1][2] * Fe[2][1];
    dJedFe[1][0] = Fe[0][2] * Fe[2][1] - Fe[0][1] * Fe[2][2];
    dJedFe[2][0] = Fe[0][1] * Fe[1][2] - Fe[0][2] * Fe[1][1];
    dJedFe[0][1] = Fe[1][2] * Fe[2][0] - Fe[1][0] * Fe[2][2];
    dJedFe[1][1] = Fe[0][0] * Fe[2][2] - Fe[0][2] * Fe[2][0];
    dJedFe[2][1] = Fe[0][2] * Fe[1][0] - Fe[0][0] * Fe[1][2];
    dJedFe[0][2] = Fe[1][0] * Fe[2][1] - Fe[1][1] * Fe[2][0];
    dJedFe[1][2] = Fe[0][1] * Fe[2][0] - Fe[0][0] * Fe[2][1];
    dJedFe[2][2] = Fe[0][0] * Fe[1][1] - Fe[0][1] * Fe[1][0];
    let Jp = determinant(Fp);
    let ESnowCurrent = params.E0 * exp(params.xi * (1.0 - Jp));   // Current Young's modulus for snow
    let muSnow = ESnowCurrent / (2.0 * (1.0 + params.nuSnow));
    let lambdaSnow = ESnowCurrent * params.nuSnow / ((1.0 + params.nuSnow) * (1.0 - 2.0 * params.nuSnow));
    return 2.0 * muSnow * (Fe - R) + lambdaSnow * (Je - 1.0) * dJedFe;
  }

  @compute @workgroup_size(1)
  fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= u32(${numPArg})) { return; }

    var termJello: mat3x3<f32>;
    var termSnow: mat3x3<f32>;
    var termFluid: f32;
    let materialType = i32(round(particles1[index].pos.w));
    if (materialType == 0) {  // JELLO
      let FP = particles2[index].F;
      let P = fixedCorotated(FP);
      termJello = -1.0 * particles2[index].vol * P * transpose(FP);
    } else if (materialType == 1) { // SNOW
      let FeP = particles2[index].Fe;
      let FpP = particles2[index].Fp;
      let P = fixedCorotatedSnow(FeP, FpP);
      termSnow = -1.0 * particles2[index].vol * P * transpose(FeP);
    } else if (materialType == 2) { // FLUID
      let J = particles2[index].J;
      let dPhidJ = -params.lambdaFluid * (pow(J, -params.gamma) - 1.0);
      termFluid = -1.0 * particles2[index].vol * dPhidJ * J;
    } else {
    }

    let minCorner = vec3<f32>(params.minCornerX, params.minCornerY, params.minCornerZ);
    let posP_index_space = (particles1[index].pos.xyz - minCorner) / params.h;

    let Weights1D_PI = computeWeights1D_P(posP_index_space.x);
    let Weights1D_PJ = computeWeights1D_P(posP_index_space.y);
    let Weights1D_PK = computeWeights1D_P(posP_index_space.z);

    let wI = Weights1D_PI.w;
    let dwI = Weights1D_PI.dw;
    let baseNodeI = Weights1D_PI.baseNode;

    let wJ = Weights1D_PJ.w;
    let dwJ = Weights1D_PJ.dw;
    let baseNodeJ = Weights1D_PJ.baseNode;

    let wK = Weights1D_PK.w;
    let dwK = Weights1D_PK.dw;
    let baseNodeK = Weights1D_PK.baseNode;

    for (var k = 0; k < 3; k++) {
      for (var j = 0; j < 3; j++) {
        for (var i = 0; i < 3; i++) {
          let nodeI = baseNodeI + i;
          let nodeJ = baseNodeJ + j;
          let nodeK = baseNodeK + k;
          let nodeID = coordinateToId(vec3<i32>(nodeI, nodeJ, nodeK));

          let grad_weightIJK = vec3<f32>(
            dwI[i] * wJ[j] * wK[k] / params.h,
            wI[i] * dwJ[j] * wK[k] / params.h,
            wI[i] * wJ[j] * dwK[k] / params.h
          );

          if (materialType == 0) {  // JELLO
            let termJelloWeighted = termJello * grad_weightIJK;
            atomicAddFloat(&gridNodes[nodeID].force_x, termJelloWeighted.x);
            atomicAddFloat(&gridNodes[nodeID].force_y, termJelloWeighted.y);
            atomicAddFloat(&gridNodes[nodeID].force_z, termJelloWeighted.z);
          } else if (materialType == 1) { // SNOW
            let termSnowWeighted = termSnow * grad_weightIJK;
            atomicAddFloat(&gridNodes[nodeID].force_x, termSnowWeighted.x);
            atomicAddFloat(&gridNodes[nodeID].force_y, termSnowWeighted.y);
            atomicAddFloat(&gridNodes[nodeID].force_z, termSnowWeighted.z);
          } else if (materialType == 2) { // FLUID
            let termFluidWeighted = termFluid * grad_weightIJK;
            atomicAddFloat(&gridNodes[nodeID].force_x, termFluidWeighted.x);
            atomicAddFloat(&gridNodes[nodeID].force_y, termFluidWeighted.y);
            atomicAddFloat(&gridNodes[nodeID].force_z, termFluidWeighted.z);
          } else {
          }
        }
      }
    }
  }`,
};
