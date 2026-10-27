import{a$ as e}from"./QueenComb-BZ3LplIF.js";import{k as a}from"./kernelBlurVaryingDeclaration-Boyre20G.js";import"./index-DSITshk1.js";import"./react--6nd5XBq.js";import"./motion-CvAcPNoJ.js";import"./router-DxTwtRHr.js";const t="kernelBlurVertex",o="vertexOutputs.sampleCoord{X}=vertexOutputs.sampleCenter+uniforms.delta*KERNEL_OFFSET{X};";e.IncludesShadersStoreWGSL[t]||(e.IncludesShadersStoreWGSL[t]=o);const i={name:t,shader:o},n="kernelBlurVertexShader",s=`attribute position: vec2f;uniform delta: vec2f;varying sampleCenter: vec2f;
#include<kernelBlurVaryingDeclaration>[0..varyingCount]
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {const madd: vec2f= vec2f(0.5,0.5);
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.sampleCenter=(vertexInputs.position*madd+madd);
#include<kernelBlurVertex>[0..varyingCount]
vertexOutputs.position= vec4f(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;e.ShadersStoreWGSL[n]||(e.ShadersStoreWGSL[n]=s);const d=[a,i];for(const r of d)e.IncludesShadersStoreWGSL[r.name]||(e.IncludesShadersStoreWGSL[r.name]=r.shader);const f={name:n,shader:s};export{f as kernelBlurVertexShaderWGSL};
