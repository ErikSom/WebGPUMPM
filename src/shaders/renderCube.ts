export const renderCubeShaders = {
  vertex: `
    @group(0) @binding(0) var<uniform> uniforms : Uniforms;

    struct Uniforms {
      matrices : array<mat4x4<f32>, 3>,
    };

    struct VertexInput {
      @location(0) position : vec4<f32>,
      @location(1) normal : vec4<f32>,
    };

    struct VertexOutput {
      @builtin(position) position : vec4<f32>,
      @location(0) fragLightVec : vec4<f32>,
      @location(1) fragNorm : vec4<f32>,
    };

    @vertex
    fn main(input : VertexInput) -> VertexOutput {
      var output : VertexOutput;

      let view = uniforms.matrices[0];
      let invView = uniforms.matrices[1];
      let proj = uniforms.matrices[2];
      let scale = mat4x4<f32>(
        vec4<f32>(0.92, 0.0, 0.0, 0.0),
        vec4<f32>(0.0, 0.92, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, 0.92, 0.0),
        vec4<f32>(0.0, 0.0, 0.0, 1.0)
      );

      output.position = proj * view * scale * input.position;
      output.fragLightVec = invView * vec4<f32>(0.0, 0.0, 0.0, 1.0) - input.position;
      output.fragNorm = input.normal;

      return output;
    }
  `,
  fragment: `
    struct FragmentInput {
      @location(0) fragLightVec : vec4<f32>,
      @location(1) fragNorm : vec4<f32>,
    };

    @fragment
    fn main(input : FragmentInput) -> @location(0) vec4<f32> {
      let diffuseColor = vec4<f32>(0.7, 0.7, 0.7, 1.0);

      var diffuseTerm = dot(input.fragNorm, normalize(input.fragLightVec));
      diffuseTerm = clamp(diffuseTerm, 0.0, 1.0);
      let ambientTerm = 0.2;
      let lightIntensity = diffuseTerm + ambientTerm;
      var outColor = diffuseColor * lightIntensity;
      outColor.a = 0.3;

      return outColor;
    }
  `,
};
