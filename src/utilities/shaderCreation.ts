import * as cubeParams from "../cube";
import * as cubeParams2 from "../cube2"

export function createComputePipeline(code, device) {
  const shaderModule = device.createShaderModule({
      code: code,
  });

  // Define the bind group layouts based on the shader bindings provided
  const bindGroupLayout = device.createBindGroupLayout({
      entries: [
          {
              binding: 0,
              visibility: GPUShaderStage.COMPUTE,
              buffer: {
                  type: 'uniform',
              }
          },
          {
              binding: 1,
              visibility: GPUShaderStage.COMPUTE,
              buffer: {
                  type: 'storage',
                  readWrite: true,
              }
          },
          {
              binding: 2,
              visibility: GPUShaderStage.COMPUTE,
              buffer: {
                  type: 'storage',
                  readWrite: true,
              }
          },
          {
              binding: 3,
              visibility: GPUShaderStage.COMPUTE,
              buffer: {
                  type: 'storage',
                  readWrite: true,
              }
          },
          {
              binding: 4,
              visibility: GPUShaderStage.COMPUTE,
              buffer: {
                  type: 'storage',
                  readWrite: true,
              }
          }
      ]
  });

  // Create a pipeline layout that includes the bind group layout
  const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
  });

  // Create the compute pipeline with the specified layout and shader module
  return device.createComputePipeline({
      layout: pipelineLayout,
      compute: {
          module: shaderModule,
          entryPoint: "main"
      }
  });
}

export function createRenderingPipeline(shaders, device) {
  // Define the bind group layout (if needed)
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        // Example of a uniform buffer binding
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: {
          type: 'uniform',
        }
      }
      // Add other bindings as required by your shaders
    ]
  });

  // Create a pipeline layout using the bind group layout
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout]
  });

  return device.createRenderPipeline({
    layout: pipelineLayout, // Pipeline layout is required

    vertex: {
      module: device.createShaderModule({
        code: shaders.vertex,
      }),
      entryPoint: "main",
      buffers: [ // This replaces vertexState.vertexBuffers
        {
          // Instance particles buffer
          arrayStride: 8 * 4,
          stepMode: "instance",
          attributes: [
            {
              // Instance position
              shaderLocation: 0,
              offset: 0,
              format: "float32x4",
            },
            {
              // Instance velocity
              shaderLocation: 1,
              offset: 4 * 4,
              format: "float32x4",
            },
          ],
        },
        {
          arrayStride: cubeParams.cubeVertexSize,
          stepMode: "vertex",
          attributes: [
            {
              shaderLocation: 2,
              offset: cubeParams.cubePositionOffset,
              format: "float32x4",
            },
            {
              shaderLocation: 3,
              offset: cubeParams.cubeNormalOffset,
              format: "float32x4",
            }
          ]
        }
      ],
    },

    fragment: {
      module: device.createShaderModule({
        code: shaders.fragment,
      }),
      entryPoint: "main",
      targets: [ // This replaces colorStates
        {
          format: "bgra8unorm",
        },
      ],
    },

    primitive: { // This replaces primitiveTopology
      topology: "triangle-list",
      cullMode: 'back', // Example setting, adjust as needed
    },

    depthStencil: { // This replaces depthStencilState
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus-stencil8",
    },
  });
}

export function createRenderCubePipeline(shaders, device) {
  // Create the bind group layout
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: "uniform",
        },
      },
    ],
  });

  // Create the pipeline layout
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  return device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: device.createShaderModule({
        code: shaders.vertex,
      }),
      entryPoint: "main",
      buffers: [
        {
          arrayStride: cubeParams2.cubeVertexSize,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: cubeParams2.cubePositionOffset,
              format: "float32x4",
            },
            {
              // normal
              shaderLocation: 1,
              offset: cubeParams2.cubeNormalOffset,
              format: "float32x4",
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({
        code: shaders.fragment,
      }),
      entryPoint: "main",
      targets: [
        {
          format: "bgra8unorm",
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "front",
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus-stencil8",
    },
  });
}

