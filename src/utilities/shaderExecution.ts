export function writeBuffer(device, buffer, data) {
    device.queue.writeBuffer(
      buffer,
      0,
      data.buffer,
      data.byteOffset,
      data.byteLength
    );
  }

  export function runComputePipeline(encoder, pipeline, bindgroup, totalTx, totalTy, totalTz, doBenchmark = false, benchmarkIdx = 0, benchmarkQuery = undefined) {
    const maxWorkgroupsPerDimension = 65535;

    // Split the total workgroups into manageable chunks
    const tx = Math.min(totalTx, maxWorkgroupsPerDimension);
    const ty = Math.min(totalTy, maxWorkgroupsPerDimension);
    const tz = Math.min(totalTz, maxWorkgroupsPerDimension);

    if (doBenchmark) {
        console.log(encoder);
        debugger;
        encoder.writeTimestamp(benchmarkQuery, benchmarkIdx);
    }

    {
        const passEncoder = encoder.beginComputePass();
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindgroup);

        for (let z = 0; z < Math.ceil(totalTz / tz); z++) {
            for (let y = 0; y < Math.ceil(totalTy / ty); y++) {
                for (let x = 0; x < Math.ceil(totalTx / tx); x++) {
                    passEncoder.dispatchWorkgroups(
                        Math.min(tx, totalTx - x * tx),
                        Math.min(ty, totalTy - y * ty),
                        Math.min(tz, totalTz - z * tz)
                    );
                }
            }
        }

        passEncoder.end();
    }

    if (doBenchmark) {
        encoder.writeTimestamp(benchmarkQuery, benchmarkIdx + 1);
    }
}



export function runRenderPipeline(encoder, descriptor, renderPipeline, renderCubePipeline, uniforms, cubeUniforms, particles, cubeBuffer, numInstances, useInstance = false, instanceVertices = 1, instanceBuffer = undefined, doBenchmark : Boolean = false, benchmarkIdx : number= 0, benchmarkQuery : GPUQuerySet = undefined) 
{
    if (doBenchmark) {
        encoder.writeTimestamp(benchmarkQuery, benchmarkIdx);
    }


    {
        const passEncoder = encoder.beginRenderPass(descriptor);
        passEncoder.setPipeline(renderPipeline);
        passEncoder.setBindGroup(0, uniforms);
        passEncoder.setVertexBuffer(0, particles);
        if (useInstance) {
            passEncoder.setVertexBuffer(1, instanceBuffer);
        }
        passEncoder.draw(instanceVertices, numInstances, 0, 0);

        passEncoder.setPipeline(renderCubePipeline);
        passEncoder.setBindGroup(0, cubeUniforms);
        passEncoder.setVertexBuffer(0, cubeBuffer);
        passEncoder.draw(36, 1, 0, 0);
        
        passEncoder.end();
    }



    if (doBenchmark) {
        encoder.writeTimestamp(benchmarkQuery, benchmarkIdx + 1);
    }
}
