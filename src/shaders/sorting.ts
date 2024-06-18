import { gridStruct, layout } from "./struct";

export const sortingShader = {

  reduce: (numPArg: number, numGArg: number) => `#version 450
  ${layout}

  layout(std140, set = 0, binding = 1) uniform SortParameters {
    int step;
    float PADDING_1; // IGNORE
    float PADDING_2; // IGNORE
    float PADDING_3; // IGNORE
  } sortParams;

  ${gridStruct}

  layout(std430, set = 0, binding = 2) buffer GRIDNODES {
    GridNodeStruct data[${numGArg}];
  } gridNodes;

  layout(std430, set = 0, binding = 3) buffer REDUCEBUFFER {
    int data[${numGArg}];
  } reductionBuffer;

  void main() {
    if (sortParams.step == 1) {
        int index = gl_GlobalInvocationID.x;
        if (index > ${numGArg}) { return; }
        reductionBuffer[index] = int(gridNodes[index].m > 0);
    }
    else {
        int index = ((gl_GlobalInvocationID.x+1) * sortParams.step) - 1;
        if (index > ${numGArg}) { return; }
        reductionBuffer[index] += reductionBuffer[index - sortParams.step / 2];
    }
  }`,



};
