import { gridStruct, layout, particleStruct, steamCompStruct, structLayout } from "./struct";

export const evolveFandJShader = {
    evolveFandJ: (numPArg: number, numGArg: number, numGPaddedArg: number) => `
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

    fn approx_givens_quat(s_pp: f32, s_pq: f32, s_qq: f32) -> vec2<f32> {
        let c_h = 2.0 * (s_pp - s_qq);
        let s_h2 = s_pq * s_pq;
        let c_h2 = c_h * c_h;
        if (5.8284271247 * s_h2 < c_h2) {
            let omega = 1.0 / sqrt(s_h2 + c_h2);
            return vec2<f32>(omega * c_h, omega * s_pq);
        }
        return vec2<f32>(0.9238795325, 0.3826834323);
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
        if (rho <= 0.0000001) {
            s_h = 0.0;
            max_rho_eps = 0.0000001;
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
    };

    fn qr_decomp(B: mat3x3<f32>) -> QR_mats {
        var qr_decomp_result: QR_mats;
        var R: mat3x3<f32>;
        var ch_sh10 = approx_qr_givens_quat(B[0][0], B[0][1]);
        var Q10 = quat_to_mat3(vec4<f32>(ch_sh10.x, 0.0, 0.0, ch_sh10.y));
        R = transpose(Q10) * B;
        var ch_sh20 = approx_qr_givens_quat(R[0][0], R[0][2]);
        var Q20 = quat_to_mat3(vec4<f32>(ch_sh20.x, 0.0, -ch_sh20.y, 0.0));
        R = transpose(Q20) * R;
        var ch_sh21 = approx_qr_givens_quat(R[1][1], R[1][2]);
        var Q21 = quat_to_mat3(vec4<f32>(ch_sh21.x, ch_sh21.y, 0.0, 0.0));
        R = transpose(Q21) * R;
        qr_decomp_result.R = R;
        qr_decomp_result.Q = Q10 * Q20 * Q21;
        return qr_decomp_result;
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
        var QR = qr_decomp(B);
        svd_result.U = QR.Q;
        svd_result.Sigma = QR.R;
        return svd_result;
    }

    fn determinant3x3(m: mat3x3<f32>) -> f32 {
        return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
               m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
               m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    }
    
    fn inverse3x3(m: mat3x3<f32>) -> mat3x3<f32> {
        let det = determinant3x3(m);
        if (det == 0.0) {
            return mat3x3<f32>(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0); // Return identity matrix if determinant is zero
        }
        let inv_det = 1.0 / det;
        return mat3x3<f32>(
            (m[1][1] * m[2][2] - m[1][2] * m[2][1]) * inv_det,
            (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * inv_det,
            (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * inv_det,
            (m[1][2] * m[2][0] - m[1][0] * m[2][2]) * inv_det,
            (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * inv_det,
            (m[0][2] * m[1][0] - m[0][0] * m[1][2]) * inv_det,
            (m[1][0] * m[2][1] - m[1][1] * m[2][0]) * inv_det,
            (m[0][1] * m[2][0] - m[0][0] * m[2][1]) * inv_det,
            (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * inv_det
        );
    }

    @compute @workgroup_size(1)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index >= u32(${numPArg})) { return; }
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
        
        var grad_vP = mat3x3<f32>(
            vec3<f32>(0.0, 0.0, 0.0),
            vec3<f32>(0.0, 0.0, 0.0),
            vec3<f32>(0.0, 0.0, 0.0)
        );
        var vP = 0.0;
        let material = i32(round(particles1[index].pos.w));
        
        for (var k = 0; k < 3; k++) {
            for (var j = 0; j < 3; j++) {
                for (var i = 0; i < 3; i++) {
                    let nodeI = baseNodeI + i;
                    let nodeJ = baseNodeJ + j;
                    let nodeK = baseNodeK + k;
                    let nodeID = coordinateToId(vec3<i32>(nodeI, nodeJ, nodeK));
                    let grad_weightIJK = vec3<f32>(dwI[i] * wJ[j] * wK[k] / params.h,
                                                    wI[i] * dwJ[j] * wK[k] / params.h,
                                                    wI[i] * wJ[j] * dwK[k] / params.h);

                    if (material == 0 || material == 1) {
                        grad_vP += mat3x3<f32>(
                            gridNodes[nodeID].vN.x * grad_weightIJK.x, gridNodes[nodeID].vN.x * grad_weightIJK.y, gridNodes[nodeID].vN.x * grad_weightIJK.z,
                            gridNodes[nodeID].vN.y * grad_weightIJK.x, gridNodes[nodeID].vN.y * grad_weightIJK.y, gridNodes[nodeID].vN.y * grad_weightIJK.z,
                            gridNodes[nodeID].vN.z * grad_weightIJK.x, gridNodes[nodeID].vN.z * grad_weightIJK.y, gridNodes[nodeID].vN.z * grad_weightIJK.z
                        );
                    }
                    if (material == 2) {
                        vP += dot(gridNodes[nodeID].vN, grad_weightIJK);
                    }
                }
            }
        }
        let identity_matrix = mat3x3<f32>(
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
        );

        let scaled_grad_vP = mat3x3<f32>(
            grad_vP[0][0] * params.dt, grad_vP[0][1] * params.dt, grad_vP[0][2] * params.dt,
            grad_vP[1][0] * params.dt, grad_vP[1][1] * params.dt, grad_vP[1][2] * params.dt,
            grad_vP[2][0] * params.dt, grad_vP[2][1] * params.dt, grad_vP[2][2] * params.dt
        );

        if (material == 0) {
            particles2[index].F = (identity_matrix + scaled_grad_vP) * particles2[index].F;
        } else if (material == 1) {
            var FePNew = (identity_matrix + scaled_grad_vP) * particles2[index].Fe;
            var FPNew = FePNew * particles2[index].Fp;
            var FePNew_SVD = svd(FePNew);
            var u = FePNew_SVD.U;
            var sigma = FePNew_SVD.Sigma;
            var v = FePNew_SVD.V;
            sigma[0][0] = max(1.0 - params.thetaC, min(sigma[0][0], 1.0 + params.thetaS));
            sigma[1][1] = max(1.0 - params.thetaC, min(sigma[1][1], 1.0 + params.thetaS));
            sigma[2][2] = max(1.0 - params.thetaC, min(sigma[2][2], 1.0 + params.thetaS));
            FePNew = u * sigma * transpose(v);
            particles2[index].Fe = FePNew;
            particles2[index].Fp = inverse3x3(FePNew) * FPNew;
        } else if (material == 2) {
            particles2[index].J = particles2[index].J * (1.0 + params.dt * vP);
        }
    }
`,
};
