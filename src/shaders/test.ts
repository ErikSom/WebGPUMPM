export const testShader = {
/* ---------------------------------------------------------------------------- */
/* ------------------------------------ test ---------------------------------- */
/* ---------------------------------------------------------------------------- */
  test: (numPArg: number, numGArg: number, numGPaddedArg: number) => `#version 450
  layout(std140, set = 0, binding = 0) uniform SimParams {
    float dt; // Timestep
    float gravityX;  // Gravity (x-component)
    float gravityY;  // Gravity (y-component)
    float gravityZ;  // Gravity (z-component)
    float minCornerX; // Min corner of the grid (x-component) (also works as the origin of the grid for offsetting purposes)
    float minCornerY; // Min corner of the grid (y-component) (also works as the origin of the grid for offsetting purposes)
    float minCornerZ; // Min corner of the grid (z-component) (also works as the origin of the grid for offsetting purposes)
    float maxCornerX;  // Max corner of the grid (x-component)
    float maxCornerY;  // Max corner of the grid (y-component)
    float maxCornerZ;  // Max corner of the grid (z-component)
    float h; // Cell width of the grid
    float nxG;  // Number of grid points in the x-direction
    float nyG;  // Number of grid points in the y-direction
    float nzG;  // Number of grid points in the z-direction
    float numG; // Total number of grid points
    float E;  // Young's Modulus (Hardness)
    float E0; // Initial Young's Modulus (for snow)
    float nu; // Poisson's Ratio (Incompressibility)
    float nuSnow; // Poisson's Ratio (for snow)
    float thetaC; // Critical compression (for snow)
    float thetaS;  // Critical stretch (for snow)
    float xi;  // Hardening coefficient (for snow)
    float mu;  // One of the Lamé parameters
    float lambda;  // One of the Lamé parameters
    float lambdaFluid; // parameter for fluid
    float gamma;  // parameter for fluid
    float rhoJello;  // Density of the points' material for jello
    float rhoSnow;  // Density of the points' material for snow
    float rhoFluid; // Density of the points' material for fluid
    float numP;  // Total number of points
    float PADDING_1; // IGNORE
    float PADDING_2; // IGNORE
  } params;
  struct ParticleStruct1 {
    vec4 pos; // (pos.xyz => Particle Position, pos.w => Particle Material Type)
    vec4 v; // (v.xyz => Particle Velocity, v.w => Particle Mass)
  };
  struct ParticleStruct2 {
    mat3 F; // Deformation Graident Of The Particle
    mat3 Fe;  // Elastic Component Of The Deformation Gradient Of The Particle
    mat3 Fp;  // Plastic Component Of The Deformation Gradient Of The Particle
    mat3 C; // APIC's C Matrix Of The Particle
    float J;  // J attribute Of The Particle
    float vol;  // Volume Of The Particle
    float PADDING_1;  // (IGNORE)
    float PADDING_2;  // (IGNORE)
  };
  struct GridNodeStruct {
    vec3 vN;  // New Velocity Stored On The Grid Node
    vec3 v; // Old Velocity Stored On The Grid Node
    vec3 force; // Force Stored On The Grid Node
    float m;  // Mass Stored On The Grid Node
    float PADDING_1;  // (IGNORE)
    float PADDING_2;  // (IGNORE)
    float PADDING_3;  // (IGNORE)
  };
  struct StreamCompStruct {
    float criteria; // Criteria (Only Has Value 0 Or 1)
    float scan; // Scan Result (Result Of Exclusive Scanning The Criteria Buffer)
    float compact; // Stream Compaction Result (Final Result Of Stream Compaction After Scattering)
    float d; // Iteration Depth (Storing The Current Iteration Depth In Up-Sweep And Down-Sweep)
  };
  layout(std430, set = 0, binding = 1) buffer PARTICLES1 {
    ParticleStruct1 data[${numPArg}];
  } particles1;
  layout(std430, set = 0, binding = 2) buffer PARTICLES2 {
    ParticleStruct2 data[${numPArg}];
  } particles2;
  layout(std430, set = 0, binding = 3) buffer GRIDNODES {
    GridNodeStruct data[${numGArg}];
  } gridNodes;
  layout(std430, set = 0, binding = 4) buffer STREAMCOMPACTION {
    StreamCompStruct data[${numGPaddedArg}];
  } SC;

  int coordinateToId(ivec3 c) {
    return c[0] + int(params.nxG) * c[1] + int(params.nxG) * int(params.nyG) * c[2];
  }

  void main() {
    uint index = gl_GlobalInvocationID.x;
    if (index >= ${numPArg}) { return; }

    float testVarX = SC.data[${numGPaddedArg} - 1].criteria;
    float testVarY = SC.data[${numGPaddedArg} - 1].scan;
    float testVarZ = SC.data[${numGPaddedArg} - 1].compact;
    float testVarW = SC.data[${numGPaddedArg} - 1].d;
    vec3 testVec = vec3(testVarX, testVarW, testVarZ);
    // particles1.data[index].pos += vec4(testVec * 0.005, 0);
    // int test = 1 << 2;
    // test = int(pow(2, 1));
    int numActiveNodes = int(SC.data[${numGPaddedArg} - 1].criteria) + int(SC.data[${numGPaddedArg} - 1].scan);
    particles1.data[index].pos += vec4(vec3(0, numActiveNodes, 0) * 0.00005, 0);

    // uint indexI = gl_GlobalInvocationID.x;
    // uint indexJ = gl_GlobalInvocationID.y;
    // uint indexK = gl_GlobalInvocationID.z;
    // if (indexI >= params.nxG || indexJ >= params.nyG || indexK >= params.nzG) { return; }
    
    // int baseNodeI = int(indexI);
    // int baseNodeJ = int(indexJ);
    // int baseNodeK = int(indexK);
    // int nodeID = coordinateToId(ivec3(baseNodeI, baseNodeJ, baseNodeK));
    
    // // Atomic Add Float Test
    // if (nodeID < ${numPArg}) {
    //   // particles1.data[nodeID].pos += vec4(vec3(0, uintBitsToFloat(gridNodes.data[33].m), 0), 0);
    //   particles1.data[nodeID].pos += vec4(vec3(0, gridNodes.data[33].m, 0), 0);
    //   particles1.data[nodeID].pos += vec4(-vec3(0, -8.0 * ${numPArg}, 0), 0);

    //   // particles1.data[nodeID].pos += vec4(uintBitsToFloat(gridNodes.data[33].force), 0);
    //   particles1.data[nodeID].pos += vec4(gridNodes.data[33].force, 0);
    //   particles1.data[nodeID].pos += vec4(-vec3(-1.0, 2.0, -5.0) * ${numPArg}, 0);
    // }
  }`,
};