import{a$ as e}from"./QueenComb-BZ3LplIF.js";import{c as a,a as t}from"./clipPlaneFragment-C7aN-mAL.js";import{f as i,a as f}from"./fogFragment-BJFNprSr.js";import"./index-DSITshk1.js";import"./react--6nd5XBq.js";import"./motion-CvAcPNoJ.js";import"./router-DxTwtRHr.js";const r="colorPixelShader",o=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
#define VERTEXCOLOR
varying vColor: vec4f;
#else
uniform color: vec4f;
#endif
#include<clipPlaneFragmentDeclaration>
#include<fogFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
fragmentOutputs.color=input.vColor;
#else
fragmentOutputs.color=uniforms.color;
#endif
#include<fogFragment>(color,fragmentOutputs.color)
#define CUSTOM_FRAGMENT_MAIN_END
}`;e.ShadersStoreWGSL[r]||(e.ShadersStoreWGSL[r]=o);const d=[a,i,t,f];for(const n of d)e.IncludesShadersStoreWGSL[n.name]||(e.IncludesShadersStoreWGSL[n.name]=n.shader);const p={name:r,shader:o};export{p as colorPixelShaderWGSL};
