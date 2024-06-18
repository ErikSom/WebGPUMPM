import { layout, particleStruct, gridStruct, steamCompStruct, structLayout, coordinateToId } from "./struct";

export const addMaterialForceShader = {
  addMaterialForce: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
  ${layout}
  ${particleStruct}
  ${gridStruct}
  ${steamCompStruct}
  ${structLayout(numPArg, numGArg, numGPaddedArg)}
  ${coordinateToId}

  fn computeWeights1D_P(x: f32, w: ptr<function, array<f32, 3>>, dw: ptr<function, array<f32, 3>>) -> i32 {
    let baseNode: i32 = i32(floor(x - 0.5));
    let d0: f32 = x - f32(baseNode);
    (*w)[0] = 0.5 * (1.5 - d0) * (1.5 - d0);
    (*dw)[0] = d0 - 1.5;
    let d1: f32 = x - f32(baseNode + 1);
    (*w)[1] = 0.75 - d1 * d1;
    (*dw)[1] = -2.0 * d1;
    let d2: f32 = x - f32(baseNode + 2);
    (*w)[2] = 0.5 * (1.5 + d2) * (1.5 + d2);
    (*dw)[2] = 1.5 + d2;
    return baseNode;
  }

  fn computeWeights1D_G(node: i32, x: f32, w: ptr<function, f32>, dw: ptr<function, f32>) {
    let d: f32 = x - f32(node);
    if (abs(d) < 1.5) {
        if (d >= 0.5 && d < 1.5) {
            (*w) = 0.5 * (1.5 - d) * (1.5 - d);
            (*dw) = d - 1.5;
        } else if (d > -0.5 && d < 0.5) {
            (*w) = 0.75 - d * d;
            (*dw) = -2.0 * d;
        } else {
            (*w) = 0.5 * (1.5 + d) * (1.5 + d);
            (*dw) = 1.5 + d;
        }
    } else {
        (*w) = 0.0;
        (*dw) = 0.0;
    }
  }

// Helper Functions for SVD
fn approx_givens_quat(s_pp: f32, s_pq: f32, s_qq: f32) -> vec2<f32> {
    let gamma = 5.8284271247;
    let c_star = 0.9238795325;
    let s_star = 0.3826834323;
    let c_h = 2.0 * (s_pp - s_qq);
    let s_h2 = s_pq * s_pq;
    let c_h2 = c_h * c_h;
    if (gamma * s_h2 < c_h2) {
        let omega = 1.0 / sqrt(s_h2 + c_h2);
        return vec2<f32>(omega * c_h, omega * s_pq);
    }
    return vec2<f32>(c_star, s_star);
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
        vec3<f32>(1.0 - 2.0 * (qy2 + qz2), 2.0 * (qxqy + qwqz), 2.0 * (qxqz - qwqy)),
        vec3<f32>(2.0 * (qxqy - qwqz), 1.0 - 2.0 * (qx2 + qz2), 2.0 * (qyqz + qwqx)),
        vec3<f32>(2.0 * (qxqz + qwqy), 2.0 * (qyqz - qwqx), 1.0 - 2.0 * (qx2 + qy2))
    );
}

fn symmetric_eigenanalysis(A: mat3x3<f32>) -> mat3x3<f32> {
    var S = transpose(A) * A;
    var q = mat3x3<f32>(
      vec3<f32>(1.0, 0.0, 0.0),
      vec3<f32>(0.0, 1.0, 0.0),
      vec3<f32>(0.0, 0.0, 1.0)
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
    let s_h = a1;
    let max_rho_eps = rho;
    if (rho <= 0.0000001) {
        return vec2<f32>(1.0, 0.0);
    }
    let c_h = max_rho_eps + a0;
    if (a0 < 0.0) {
        let temp = c_h - 2.0 * a0;
        return vec2<f32>(s_h, temp);
    }
    let omega = 1.0 / sqrt(c_h * c_h + s_h * s_h);
    return vec2<f32>(omega * c_h, omega * s_h);
}

struct QR_mats {
    Q: mat3x3<f32>,
    R: mat3x3<f32>,
};

fn qr_decomp(B: mat3x3<f32>) -> QR_mats {
    var R = B;
    var ch_sh10 = approx_qr_givens_quat(R[0][0], R[0][1]);
    var Q10 = quat_to_mat3(vec4<f32>(ch_sh10.x, 0.0, 0.0, ch_sh10.y));
    R = transpose(Q10) * R;

    var ch_sh20 = approx_qr_givens_quat(R[0][0], R[0][2]);
    var Q20 = quat_to_mat3(vec4<f32>(ch_sh20.x, 0.0, -ch_sh20.y, 0.0));
    R = transpose(Q20) * R;

    var ch_sh21 = approx_qr_givens_quat(R[1][1], R[1][2]);
    var Q21 = quat_to_mat3(vec4<f32>(ch_sh21.x, ch_sh21.y, 0.0, 0.0));
    R = transpose(Q21) * R;

    return QR_mats(Q10 * Q20 * Q21, R);
}

struct SVD_mats {
    U: mat3x3<f32>,
    Sigma: mat3x3<f32>,
    V: mat3x3<f32>,
};

fn svd(A: mat3x3<f32>) -> SVD_mats {
    var svd_result: SVD_mats;
    svd_result.V = symmetric_eigenanalysis(A);
    var B = A * svd_result.V;

    let rho0 = dot(B[0], B[0]);
    let rho1 = dot(B[1], B[1]);
    let rho2 = dot(B[2], B[2]);
    if (rho0 < rho1) {
        let temp = B[1];
        B[1] = -B[0];
        B[0] = temp;
        let tempV = svd_result.V[1];
        svd_result.V[1] = -svd_result.V[0];
        svd_result.V[0] = tempV;
    }
    if (rho0 < rho2) {
        let temp = B[2];
        B[2] = -B[0];
        B[0] = temp;
        let tempV = svd_result.V[2];
        svd_result.V[2] = -svd_result.V[0];
        svd_result.V[0] = tempV;
    }
    if (rho1 < rho2) {
        let temp = B[2];
        B[2] = -B[1];
        B[1] = temp;
        let tempV = svd_result.V[2];
        svd_result.V[2] = -svd_result.V[1];
        svd_result.V[1] = tempV;
    }

    let QR = qr_decomp(B);
    svd_result.U = QR.Q;
    svd_result.Sigma = QR.R;
    return svd_result;
  }

  // Fixed Corotated Functions
  fn fixedCorotated(F: mat3x3<f32>) -> mat3x3<f32> {
      let F_SVD = svd(F);
      let R = F_SVD.U * transpose(F_SVD.V);
      let J = determinant(F);
      var dJdF = mat3x3<f32>(
        vec3<f32>(F[1][1] * F[2][2] - F[1][2] * F[2][1], F[0][2] * F[2][1] - F[0][1] * F[2][2], F[0][1] * F[1][2] - F[0][2] * F[1][1]),
        vec3<f32>(F[1][2] * F[2][0] - F[1][0] * F[2][2], F[0][0] * F[2][2] - F[0][2] * F[2][0], F[0][2] * F[1][0] - F[0][0] * F[1][2]),
        vec3<f32>(F[1][0] * F[2][1] - F[1][1] * F[2][0], F[0][1] * F[2][0] - F[0][0] * F[2][1], F[0][0] * F[1][1] - F[0][1] * F[1][0])
      );
      return 2.0 * params.mu * (F - R) + params.lambda * (J - 1.0) * dJdF;
  }

  fn fixedCorotatedSnow(Fe: mat3x3<f32>, Fp: mat3x3<f32>) -> mat3x3<f32> {
      let Fe_SVD = svd(Fe);
      let R = Fe_SVD.U * transpose(Fe_SVD.V);
      let Je = determinant(Fe);
      var dJedFe = mat3x3<f32>(
          vec3<f32>(Fe[1][1] * Fe[2][2] - Fe[1][2] * Fe[2][1], Fe[0][2] * Fe[2][1] - Fe[0][1] * Fe[2][2], Fe[0][1] * Fe[1][2] - Fe[0][2] * Fe[1][1]),
          vec3<f32>(Fe[1][2] * Fe[2][0] - Fe[1][0] * Fe[2][2], Fe[0][0] * Fe[2][2] - Fe[0][2] * Fe[2][0], Fe[0][2] * Fe[1][0] - Fe[0][0] * Fe[1][2]),
          vec3<f32>(Fe[1][0] * Fe[2][1] - Fe[1][1] * Fe[2][0], Fe[0][1] * Fe[2][0] - Fe[0][0] * Fe[2][1], Fe[0][0] * Fe[1][1] - Fe[0][1] * Fe[1][0])
      );
      let Jp = determinant(Fp);
      let ESnowCurrent = params.E0 * exp(params.xi * (1.0 - Jp));
      let muSnow = ESnowCurrent / (2.0 * (1.0 + params.nuSnow));
      let lambdaSnow = ESnowCurrent * params.nuSnow / ((1.0 + params.nuSnow) * (1.0 - 2.0 * params.nuSnow));
      return 2.0 * muSnow * (Fe - R) + lambdaSnow * (Je - 1.0) * dJedFe;
  }

  @compute @workgroup_size(64)
  fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let indexI = global_id.x;
    let indexJ = global_id.y;
    let indexK = global_id.z;
    if (indexI >= u32(params.nxG) || indexJ >= u32(params.nyG) || indexK >= u32(params.nzG)) { return; }

    let nodeID = coordinateToId(vec3<i32>(i32(indexI), i32(indexJ), i32(indexK)));
    var minCorner = vec3<f32>(params.minCornerX, params.minCornerY, params.minCornerZ);

    for (var p: i32 = 0; p < ${numPArg}; p++) {
      let posP_index_space = (particles1[p].pos.xyz - minCorner) / params.h;
      if (all(abs(posP_index_space - vec3<f32>(f32(indexI), f32(indexJ), f32(indexK))) < vec3<f32>(1.5))) {
        var materialType = i32(round(particles1[p].pos.w));
        var termJello: mat3x3<f32>;
        var termSnow: mat3x3<f32>;
        var termFluid: f32;

        if (materialType == 0) {  // JELLO
          let FP = particles2[p].F;
          let P = fixedCorotated(FP);
          termJello = -1.0 * particles2[p].vol * P * transpose(FP);
        } else if (materialType == 1) { // SNOW
          let FeP = particles2[p].Fe;
          let FpP = particles2[p].Fp;
          let P = fixedCorotatedSnow(FeP, FpP);
          termSnow = -1.0 * particles2[p].vol * P * transpose(FeP);
        } else if (materialType == 2) { // FLUID
          let J = particles2[p].J;
          let dPhidJ = -params.lambdaFluid * (pow(J, -params.gamma) - 1.0);
          termFluid = -1.0 * particles2[p].vol * dPhidJ * J;
        }

        var wI: f32;
        var wJ: f32;
        var wK: f32;
        var dwI: f32;
        var dwJ: f32;
        var dwK: f32;
        computeWeights1D_G(i32(indexI), posP_index_space.x, &wI, &dwI);
        computeWeights1D_G(i32(indexJ), posP_index_space.y, &wJ, &dwJ);
        computeWeights1D_G(i32(indexK), posP_index_space.z, &wK, &dwK);
        let grad_weightIJK = vec3<f32>(dwI * wJ * wK / params.h,
                                       wI * dwJ * wK / params.h,
                                       wI * wJ * dwK / params.h);

        if (materialType == 0) {  // JELLO
          gridNodes[nodeID].force += termJello * grad_weightIJK;
        } else if (materialType == 1) { // SNOW
          gridNodes[nodeID].force += termSnow * grad_weightIJK;
        } else if (materialType == 2) { // FLUID
          gridNodes[nodeID].force += termFluid * grad_weightIJK;
        }
      }
    }
  }
  `,
};
