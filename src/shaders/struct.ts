export const layout = `
	struct SimParams {
		dt: f32, // Timestep
		gravityX: f32,  // Gravity (x-component)
		gravityY: f32,  // Gravity (y-component)
		gravityZ: f32,  // Gravity (z-component)
		minCornerX: f32, // Min corner of the grid (x-component)
		minCornerY: f32, // Min corner of the grid (y-component)
		minCornerZ: f32, // Min corner of the grid (z-component)
		maxCornerX: f32,  // Max corner of the grid (x-component)
		maxCornerY: f32,  // Max corner of the grid (y-component)
		maxCornerZ: f32,  // Max corner of the grid (z-component)
		h: f32, // Cell width of the grid
		nxG: f32,  // Number of grid points in the x-direction
		nyG: f32,  // Number of grid points in the y-direction
		nzG: f32,  // Number of grid points in the z-direction
		numG: f32, // Total number of grid points
		E: f32,  // Young's Modulus (Hardness)
		E0: f32, // Initial Young's Modulus (for snow)
		nu: f32, // Poisson's Ratio (Incompressibility)
		nuSnow: f32, // Poisson's Ratio (for snow)
		thetaC: f32, // Critical compression (for snow)
		thetaS: f32,  // Critical stretch (for snow)
		xi: f32,  // Hardening coefficient (for snow)
		mu: f32,  // One of the Lamé parameters
		lambda: f32,  // One of the Lamé parameters
		lambdaFluid: f32, // parameter for fluid
		gamma: f32,  // parameter for fluid
		rhoJello: f32,  // Density of the points' material for jello
		rhoSnow: f32,  // Density of the points' material for snow
		rhoFluid: f32, // Density of the points' material for fluid
		numP: f32,  // Total number of points
		padding1: f32, // IGNORE
		padding2: f32, // IGNORE
	};

	@group(0) @binding(0) var<uniform> params: SimParams;
`;

export const particleStruct = `
	struct ParticleStruct1 {
		pos: vec4<f32>, // (pos.xyz => Particle Position, pos.w => Particle Material Type)
		v: vec4<f32>, // (v.xyz => Particle Velocity, v.w => Particle Mass)
	};

	struct ParticleStruct2 {
		F: mat3x3<f32>, // Deformation Gradient Of The Particle
		Fe: mat3x3<f32>, // Elastic Component Of The Deformation Gradient Of The Particle
		Fp: mat3x3<f32>, // Plastic Component Of The Deformation Gradient Of The Particle
		C: mat3x3<f32>, // APIC's C Matrix Of The Particle
		J: f32,  // J attribute Of The Particle
		vol: f32,  // Volume Of The Particle
		padding1: f32, // IGNORE
		padding2: f32, // IGNORE
	};
`;

export const gridStruct = `
	struct GridNodeStruct {
		vN: vec3<f32>,  // New Velocity Stored On The Grid Node
		v: vec3<f32>, // Old Velocity Stored On The Grid Node
		force: vec3<f32>, // Force Stored On The Grid Node
		m: f32,  // Mass Stored On The Grid Node
		padding1: f32, // IGNORE
		padding2: f32, // IGNORE
		padding3: f32, // IGNORE
	};
`;

export const steamCompStruct = `
	struct StreamCompStruct {
		criteria: f32, // Criteria (Only Has Value 0 Or 1)
		scan: f32, // Scan Result (Result Of Exclusive Scanning The Criteria Buffer)
		compact: f32, // Stream Compaction Result (Final Result Of Stream Compaction After Scattering)
		d: f32, // Iteration Depth (Storing The Current Iteration Depth In Up-Sweep And Down-Sweep)
	};
`;

export const coordinateToId = `
	fn coordinateToId(c: vec3<i32>) -> i32 {
		return c.x + i32(params.nxG) * c.y + i32(params.nxG) * i32(params.nyG) * c.z;
	}
`;

export const structLayout = (numPArg, numGArg, numGPaddedArg) => `
	@group(0) @binding(1) var<storage, read_write> particles1: array<ParticleStruct1>;
	@group(0) @binding(2) var<storage, read_write> particles2: array<ParticleStruct2>;
	@group(0) @binding(3) var<storage, read_write> gridNodes: array<GridNodeStruct>;
	@group(0) @binding(4) var<storage, read_write> SC: array<StreamCompStruct, ${numGPaddedArg}>;
`;
