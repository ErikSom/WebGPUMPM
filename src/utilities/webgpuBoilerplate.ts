export function setupSwapChain(device: GPUDevice, context: GPUCanvasContext) {
  const swapChainFormat = (navigator.gpu as any).getPreferredCanvasFormat();
  (context as any).configure({
    device: device,
    format: swapChainFormat,
    usage: (GPUTextureUsage as any).RENDER_ATTACHMENT
  });
}

export function getDepthTexture(device: GPUDevice, canvas: HTMLCanvasElement) {
  return device.createTexture({
    // @ts-ignore
    size: { width: canvas.width, height: canvas.height, depthOrArrayLayers: 1 },
    format: "depth24plus-stencil8",
    usage: (GPUTextureUsage as any).RENDER_ATTACHMENT
  });
}

export function getRenderPassDescriptor(depthTexture: GPUTexture): GPURenderPassDescriptor {
  const descriptor: GPURenderPassDescriptor = {
    colorAttachments: [{
      // @ts-ignore
      view: undefined as GPUTextureView | undefined,  // Assigned later
      loadOp: "clear",
      clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
      storeOp: "store",
    }],
    depthStencilAttachment: {
      // @ts-ignore
      view: depthTexture.createView(),
      depthLoadOp: "clear",
      depthClearValue: 1.0,
      depthStoreOp: "store",
      stencilLoadOp: "clear",
      stencilClearValue: 0,
      stencilStoreOp: "store",
    }
  };
  return descriptor;
}
