export const renderingShaders = {
    vertex: `struct Uniforms {
        matrices: array<mat4x4<f32>, 3>,
    };
    
    @group(0) @binding(0)
    var<uniform> uniforms: Uniforms;
    
    struct VertexInput {
        @location(0) a_particlePos: vec4<f32>,
        @location(1) a_particleVel: vec4<f32>,
        @location(2) a_cubePos: vec4<f32>,
        @location(3) a_cubeNor: vec4<f32>,
    };
    
    struct VertexOutput {
        @location(0) fs_pos: vec4<f32>,
        @location(1) fs_vel: vec4<f32>,
        @location(2) fragLightVec: vec4<f32>,
        @location(3) fragNorm: vec4<f32>,
        @builtin(position) Position: vec4<f32>,
    };
    
    @vertex
    fn main(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;
    
        let view: mat4x4<f32> = uniforms.matrices[0];
        let invView: mat4x4<f32> = uniforms.matrices[1];
        let proj: mat4x4<f32> = uniforms.matrices[2];
        var scale: f32;
    
        if (round(input.a_particlePos.w) == 2.0) {
            scale = 0.01;
        } else if (round(input.a_particlePos.w) == 1.0) {
            scale = 0.02;
        } else {
            scale = 0.02;
        }
    
        output.Position = proj * view * vec4<f32>(input.a_particlePos.xyz + (input.a_cubePos.xyz * scale), 1.0);
        output.fragLightVec = invView * vec4<f32>(0.0, 0.0, 0.0, 1.0) - vec4<f32>(input.a_particlePos.xyz + (input.a_cubePos.xyz * scale), 1.0);
        output.fs_pos = input.a_particlePos;
        output.fs_vel = input.a_particleVel;
        output.fragNorm = input.a_cubeNor;
    
        return output;
    }
  `,
  
    fragment: `
    struct FragmentInput {
        @location(0) fs_pos: vec4<f32>,
        @location(1) fs_vel: vec4<f32>,
        @location(2) fragLightVec: vec4<f32>,
        @location(3) fragNorm: vec4<f32>,
    };
    
    @fragment
    fn main(input: FragmentInput) -> @location(0) vec4<f32> {
        let pi: f32 = 3.1415926535;
        let t: f32 = clamp(length(input.fs_vel.xyz) / 2.0, 0.0, 1.0);
        let t01: f32 = clamp(length(input.fs_vel.xyz), 0.0, 1.0);
        let t02: f32 = clamp(length(input.fs_vel.xyz) / 3.0, 0.0, 1.0);
        
        // (Shader color arrays for conditions would be initialized here as needed.)
    
        var fragColor: vec4<f32> = vec4<f32>(1.0, 0.0, 1.0, 1.0); // Default color as fallback.
    
        // Conditions for different colors based on velocity and position.
        // (Handling of different particle types and colors would go here.)
    
        let diffuseTerm: f32 = dot(input.fragNorm, normalize(input.fragLightVec));
        let ambientTerm: f32 = 0.2;
        let lightIntensity: f32 = diffuseTerm + ambientTerm;
        fragColor = fragColor * lightIntensity;
    
        return fragColor;
    }
  `,
};
