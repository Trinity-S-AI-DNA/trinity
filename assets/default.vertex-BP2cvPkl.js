import{a$ as e}from"./QueenComb-Bv3n9qgd.js";import{s as P,m as D,d as R,a as X,l as W}from"./logDepthDeclaration-C06tyzuF.js";import{h as b}from"./helperFunctions-DOK4tU3z.js";import{b as F,a as G,i as z,c as C,d as B,e as w,f as H,g as Y}from"./clipPlaneVertex-BnJd5EkE.js";import{f as $,a as j,v as k}from"./vertexColorMixing-CD97APi5.js";import{m as Q,a as K,b as Z,c as q}from"./morphTargetsVertex-B47-q8Vi.js";import"./index-lvXlKcqI.js";import"./react--6nd5XBq.js";import"./motion-CvAcPNoJ.js";import"./router-DxTwtRHr.js";const i="uvAttributeDeclaration",E=`#if defined(UV{X}) && !defined(USE_VERTEX_PULLING)
attribute uv{X}: vec2f;
#endif
`;e.IncludesShadersStoreWGSL[i]||(e.IncludesShadersStoreWGSL[i]=E);const J={name:i,shader:E},a="prePassVertexDeclaration",x=`#ifdef PREPASS
#ifdef PREPASS_LOCAL_POSITION
varying vPosition : vec3f;
#endif
#ifdef PREPASS_DEPTH
varying vViewPos: vec3f;
#endif
#ifdef PREPASS_NORMALIZED_VIEW_DEPTH
varying vNormViewDepth: f32;
#endif
#if defined(PREPASS_VELOCITY) || defined(PREPASS_VELOCITY_LINEAR)
uniform previousViewProjection: mat4x4f;varying vCurrentPosition: vec4f;varying vPreviousPosition: vec4f;
#endif
#endif
`;e.IncludesShadersStoreWGSL[a]||(e.IncludesShadersStoreWGSL[a]=x);const ee={name:a,shader:x},r="samplerVertexDeclaration",I=`#if defined(_DEFINENAME_) && _DEFINENAME_DIRECTUV==0
varying v_VARYINGNAME_UV: vec2f;
#endif
`;e.IncludesShadersStoreWGSL[r]||(e.IncludesShadersStoreWGSL[r]=I);const te={name:r,shader:I},n="bumpVertexDeclaration",V=`#if defined(BUMP) || defined(PARALLAX) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#if defined(TANGENT) && defined(NORMAL) 
varying vTBN0: vec3f;varying vTBN1: vec3f;varying vTBN2: vec3f;
#endif
#endif
`;e.IncludesShadersStoreWGSL[n]||(e.IncludesShadersStoreWGSL[n]=V);const ie={name:n,shader:V},f="lightVxFragmentDeclaration",S=`#ifdef LIGHT{X}
uniform vLightData{X}: vec4f;uniform vLightDiffuse{X}: vec4f;
#ifdef SPECULARTERM
uniform vLightSpecular{X}: vec4f;
#else
var vLightSpecular{X}: vec4f= vec4f(0.);
#endif
#ifdef SHADOW{X}
#ifdef SHADOWCSM{X}
uniform lightMatrix{X}: mat4x4f[SHADOWCSMNUM_CASCADES{X}];varying var vPositionFromLight{X}: vec4f[SHADOWCSMNUM_CASCADES{X}];varying var vDepthMetric{X}: f32[SHADOWCSMNUM_CASCADES{X}];varying var vPositionFromCamera{X}: vec4f;
#elif defined(SHADOWCUBE{X})
#else
varying var vPositionFromLight{X}: vec4f;varying var vDepthMetric{X}: f32;uniform lightMatrix{X}: mat4x4f;
#endif
uniform shadowsInfo{X}: vec4f;uniform depthValues{X}: vec2f;
#endif
#ifdef SPOTLIGHT{X}
uniform vLightDirection{X}: vec4f;uniform vLightFalloff{X}: vec4f;
#elif defined(POINTLIGHT{X})
uniform vLightFalloff{X}: vec4f;
#elif defined(HEMILIGHT{X})
uniform vLightGround{X}: vec3f;
#endif
#if defined(AREALIGHT{X}) && defined(AREALIGHTUSED) && defined(AREALIGHTSUPPORTED)
uniform vLightWidth{X}: vec4f;uniform vLightHeight{X}: vec4f;
#endif
#endif
`;e.IncludesShadersStoreWGSL[f]||(e.IncludesShadersStoreWGSL[f]=S);const ae={name:f,shader:S},d="lightVxUboDeclaration",N=`#ifdef LIGHT{X}
struct Light{X}
{vLightData: vec4f,
vLightDiffuse: vec4f,
vLightSpecular: vec4f,
#ifdef SPOTLIGHT{X}
vLightDirection: vec4f,
vLightFalloff: vec4f,
#elif defined(POINTLIGHT{X})
vLightFalloff: vec4f,
#elif defined(HEMILIGHT{X})
vLightGround: vec3f,
#elif defined(CLUSTLIGHT{X})
vSliceData: vec2f,
vSliceRanges: array<vec4f,CLUSTLIGHT_SLICES>,
#endif
#if defined(AREALIGHT{X}) && defined(AREALIGHTUSED) && defined(AREALIGHTSUPPORTED)
vLightWidth: vec4f,
vLightHeight: vec4f,
#endif
shadowsInfo: vec4f,
depthValues: vec2f} ;var<uniform> light{X} : Light{X};
#ifdef SHADOW{X}
#ifdef SHADOWCSM{X}
uniform lightMatrix{X}: array<mat4x4f,SHADOWCSMNUM_CASCADES{X}>;varying vPositionFromLight{X}_0: vec4f;varying vDepthMetric{X}_0: f32;varying vPositionFromLight{X}_1: vec4f;varying vDepthMetric{X}_1: f32;varying vPositionFromLight{X}_2: vec4f;varying vDepthMetric{X}_2: f32;varying vPositionFromLight{X}_3: vec4f;varying vDepthMetric{X}_3: f32;varying vPositionFromCamera{X}: vec4f;
#elif defined(SHADOWCUBE{X})
#else
varying vPositionFromLight{X}: vec4f;varying vDepthMetric{X}: f32;uniform lightMatrix{X}: mat4x4f;
#endif
#endif
#endif
`;e.IncludesShadersStoreWGSL[d]||(e.IncludesShadersStoreWGSL[d]=N);const re={name:d,shader:N},o="vertexPullingDeclaration",T=`#ifdef USE_VERTEX_PULLING
#ifdef VERTEX_PULLING_USE_INDEX_BUFFER
var<storage,read> indices : array<u32>;
#endif
var<storage,read> position : array<f32>;uniform vp_position_info : vec4f;
#ifdef NORMAL
var<storage,read> normal : array<f32>;uniform vp_normal_info : vec4f;
#endif
#ifdef TANGENT
var<storage,read> tangent : array<f32>;uniform vp_tangent_info : vec4f;
#endif
#ifdef UV1
var<storage,read> uv : array<f32>;uniform vp_uv_info : vec4f;
#define VP_UV1_SUPPORTED
#endif
#ifdef UV2
var<storage,read> uv2 : array<f32>;uniform vp_uv2_info : vec4f;
#define VP_UV2_SUPPORTED
#endif
#ifdef UV3
var<storage,read> uv3 : array<f32>;uniform vp_uv3_info : vec4f;
#define VP_UV3_SUPPORTED
#endif
#ifdef UV4
var<storage,read> uv4 : array<f32>;uniform vp_uv4_info : vec4f;
#define VP_UV4_SUPPORTED
#endif
#ifdef UV5
var<storage,read> uv5 : array<f32>;uniform vp_uv5_info : vec4f;
#define VP_UV5_SUPPORTED
#endif
#ifdef UV6
var<storage,read> uv6 : array<f32>;uniform vp_uv6_info : vec4f;
#define VP_UV6_SUPPORTED
#endif
#ifdef VERTEXCOLOR
var<storage,read> color : array<f32>;uniform vp_color_info : vec4f;
#endif
#if NUM_BONE_INFLUENCERS>0
var<storage,read> matricesIndices : array<u32>;var<storage,read> matricesWeights : array<f32>;uniform vp_matricesIndices_info : vec4f;uniform vp_matricesWeights_info : vec4f;
#if NUM_BONE_INFLUENCERS>4
var<storage,read> matricesIndicesExtra : array<u32>;var<storage,read> matricesWeightsExtra : array<f32>;uniform vp_matricesIndicesExtra_info : vec4f;uniform vp_matricesWeightsExtra_info : vec4f;
#endif
#endif
fn vp_convertToFloat(word : u32,byteInWord : u32,dataType : u32,normalized : bool)->f32 {switch (dataType) {case 5120u: { 
let shift=byteInWord*8u;let value=(word>>shift) & 0xFFu;let signedValue=f32(i32(value<<24u)>>24u);if (normalized) { return signedValue/127.0; }
return signedValue;}
case 5121u: { 
let shift=byteInWord*8u;let value=(word>>shift) & 0xFFu;if (normalized) { return f32(value)/255.0; }
return f32(value);}
case 5122u: { 
let shift=(byteInWord & 0xFFFFFFFEu)*8u;let value=(word>>shift) & 0xFFFFu;let signedValue=f32(i32(value<<16u)>>16u);if (normalized) { return signedValue/32767.0; }
return signedValue;}
case 5123u: { 
let shift=(byteInWord & 0xFFFFFFFEu)*8u;let value=(word>>shift) & 0xFFFFu;if (normalized) { return f32(value)/65535.0; }
return f32(value);}
case 5126u: { 
return bitcast<f32>(word);}
default: { return 0.0; }}}
fn vp_componentSize(dataType : u32)->u32 {return select(select(2u,1u,dataType==5120u || dataType==5121u),4u,dataType==5126u);}
fn vp_readVertexIndex(index : u32)->u32 {
#ifndef VERTEX_PULLING_USE_INDEX_BUFFER
return index;
#else
#ifdef VERTEX_PULLING_INDEX_BUFFER_32BITS
return indices[index];
#else
let u32_index=index/2u;let bit_offset=(index & 1u)*16u;return (indices[u32_index]>>bit_offset) & 0xFFFFu;
#endif
#endif
}
fn vp_readPositionValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(position[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readPosition(info : vec4f,vertexIndex : u32)->vec3f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec3f(
vp_readPositionValue(offset,dataType,normalized),
vp_readPositionValue(offset+cs,dataType,normalized),
vp_readPositionValue(offset+cs*2u,dataType,normalized)
);}
#ifdef NORMAL
fn vp_readNormalValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(normal[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readNormal(info : vec4f,vertexIndex : u32)->vec3f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec3f(
vp_readNormalValue(offset,dataType,normalized),
vp_readNormalValue(offset+cs,dataType,normalized),
vp_readNormalValue(offset+cs*2u,dataType,normalized)
);}
#endif
#ifdef TANGENT
fn vp_readTangentValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(tangent[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readTangent(info : vec4f,vertexIndex : u32)->vec4f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec4f(
vp_readTangentValue(offset,dataType,normalized),
vp_readTangentValue(offset+cs,dataType,normalized),
vp_readTangentValue(offset+cs*2u,dataType,normalized),
vp_readTangentValue(offset+cs*3u,dataType,normalized)
);}
#endif
#ifdef UV1
fn vp_readUVValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(uv[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readUV(info : vec4f,vertexIndex : u32)->vec2f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec2f(
vp_readUVValue(offset,dataType,normalized),
vp_readUVValue(offset+cs,dataType,normalized)
);}
#endif
#ifdef UV2
fn vp_readUV2Value(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(uv2[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readUV2(info : vec4f,vertexIndex : u32)->vec2f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec2f(
vp_readUV2Value(offset,dataType,normalized),
vp_readUV2Value(offset+cs,dataType,normalized)
);}
#endif
#ifdef UV3
fn vp_readUV3Value(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(uv3[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readUV3(info : vec4f,vertexIndex : u32)->vec2f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec2f(
vp_readUV3Value(offset,dataType,normalized),
vp_readUV3Value(offset+cs,dataType,normalized)
);}
#endif
#ifdef UV4
fn vp_readUV4Value(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(uv4[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readUV4(info : vec4f,vertexIndex : u32)->vec2f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec2f(
vp_readUV4Value(offset,dataType,normalized),
vp_readUV4Value(offset+cs,dataType,normalized)
);}
#endif
#ifdef UV5
fn vp_readUV5Value(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(uv5[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readUV5(info : vec4f,vertexIndex : u32)->vec2f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec2f(
vp_readUV5Value(offset,dataType,normalized),
vp_readUV5Value(offset+cs,dataType,normalized)
);}
#endif
#ifdef UV6
fn vp_readUV6Value(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(uv6[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readUV6(info : vec4f,vertexIndex : u32)->vec2f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec2f(
vp_readUV6Value(offset,dataType,normalized),
vp_readUV6Value(offset+cs,dataType,normalized)
);}
#endif
#ifdef VERTEXCOLOR
fn vp_readColorValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(color[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readColor(info : vec4f,vertexIndex : u32)->vec4f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec4f(
vp_readColorValue(offset,dataType,normalized),
vp_readColorValue(offset+cs,dataType,normalized),
vp_readColorValue(offset+cs*2u,dataType,normalized),
vp_readColorValue(offset+cs*3u,dataType,normalized)
);}
#endif
#if NUM_BONE_INFLUENCERS>0
fn vp_readMatrixIndexValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(matricesIndices[byteOffset/4u],byteOffset % 4u,dataType,normalized);}
fn vp_readBoneIndices(info : vec4f,vertexIndex : u32)->vec4f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec4f(
vp_readMatrixIndexValue(offset,dataType,normalized),
vp_readMatrixIndexValue(offset+cs,dataType,normalized),
vp_readMatrixIndexValue(offset+cs*2u,dataType,normalized),
vp_readMatrixIndexValue(offset+cs*3u,dataType,normalized)
);}
fn vp_readMatrixWeightValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(matricesWeights[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readBoneWeights(info : vec4f,vertexIndex : u32)->vec4f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec4f(
vp_readMatrixWeightValue(offset,dataType,normalized),
vp_readMatrixWeightValue(offset+cs,dataType,normalized),
vp_readMatrixWeightValue(offset+cs*2u,dataType,normalized),
vp_readMatrixWeightValue(offset+cs*3u,dataType,normalized)
);}
#if NUM_BONE_INFLUENCERS>4
fn vp_readMatrixIndexExtraValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(matricesIndicesExtra[byteOffset/4u],byteOffset % 4u,dataType,normalized);}
fn vp_readBoneIndicesExtra(info : vec4f,vertexIndex : u32)->vec4f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec4f(
vp_readMatrixIndexExtraValue(offset,dataType,normalized),
vp_readMatrixIndexExtraValue(offset+cs,dataType,normalized),
vp_readMatrixIndexExtraValue(offset+cs*2u,dataType,normalized),
vp_readMatrixIndexExtraValue(offset+cs*3u,dataType,normalized)
);}
fn vp_readMatrixWeightExtraValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(matricesWeightsExtra[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readBoneWeightsExtra(info : vec4f,vertexIndex : u32)->vec4f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec4f(
vp_readMatrixWeightExtraValue(offset,dataType,normalized),
vp_readMatrixWeightExtraValue(offset+cs,dataType,normalized),
vp_readMatrixWeightExtraValue(offset+cs*2u,dataType,normalized),
vp_readMatrixWeightExtraValue(offset+cs*3u,dataType,normalized)
);}
#endif
#endif
#endif
`;e.IncludesShadersStoreWGSL[o]||(e.IncludesShadersStoreWGSL[o]=T);const ne={name:o,shader:T},s="vertexPullingVertex",A=`#ifdef USE_VERTEX_PULLING
let vpVertexIndex: u32=vp_readVertexIndex(vertexInputs.vertexIndex);positionUpdated=vp_readPosition(uniforms.vp_position_info,vpVertexIndex);
#ifdef NORMAL
normalUpdated=vp_readNormal(uniforms.vp_normal_info,vpVertexIndex);
#endif
#ifdef TANGENT
tangentUpdated=vp_readTangent(uniforms.vp_tangent_info,vpVertexIndex);
#endif
#ifdef UV1
uvUpdated=vp_readUV(uniforms.vp_uv_info,vpVertexIndex);
#endif
#ifdef UV2
uv2Updated=vp_readUV2(uniforms.vp_uv2_info,vpVertexIndex);
#endif
#ifdef UV3
var uv3Updated: vec2f=vp_readUV3(uniforms.vp_uv3_info,vpVertexIndex);
#endif
#ifdef UV4
var uv4Updated: vec2f=vp_readUV4(uniforms.vp_uv4_info,vpVertexIndex);
#endif
#ifdef UV5
var uv5Updated: vec2f=vp_readUV5(uniforms.vp_uv5_info,vpVertexIndex);
#endif
#ifdef UV6
var uv6Updated: vec2f=vp_readUV6(uniforms.vp_uv6_info,vpVertexIndex);
#endif
#ifdef VERTEXCOLOR
colorUpdated=vp_readColor(uniforms.vp_color_info,vpVertexIndex);
#endif
#ifdef MORPHTARGETS
let vp_basePosition: vec3f=positionUpdated;
#ifdef NORMAL
let vp_baseNormal: vec3f=normalUpdated;
#endif
#ifdef TANGENT
let vp_baseTangent: vec4f=tangentUpdated;
#endif
#ifdef UV1
let vp_baseUV: vec2f=uvUpdated;
#endif
#ifdef UV2
let vp_baseUV2: vec2f=uv2Updated;
#endif
#ifdef VERTEXCOLOR
let vp_baseColor: vec4f=colorUpdated;
#endif
#endif
#if NUM_BONE_INFLUENCERS>0
var vp_matricesIndices: vec4f=vp_readBoneIndices(uniforms.vp_matricesIndices_info,vpVertexIndex);var vp_matricesWeights: vec4f=vp_readBoneWeights(uniforms.vp_matricesWeights_info,vpVertexIndex);
#if NUM_BONE_INFLUENCERS>4
var vp_matricesIndicesExtra: vec4f=vp_readBoneIndicesExtra(uniforms.vp_matricesIndicesExtra_info,vpVertexIndex);var vp_matricesWeightsExtra: vec4f=vp_readBoneWeightsExtra(uniforms.vp_matricesWeightsExtra_info,vpVertexIndex);
#endif
#endif
#endif
`;e.IncludesShadersStoreWGSL[s]||(e.IncludesShadersStoreWGSL[s]=A);const fe={name:s,shader:A},v="prePassVertex",O=`#ifdef PREPASS_DEPTH
vertexOutputs.vViewPos=(scene.view*worldPos).rgb;
#endif
#ifdef PREPASS_NORMALIZED_VIEW_DEPTH
vertexOutputs.vNormViewDepth=((scene.view*worldPos).z-uniforms.cameraInfo.x)/(uniforms.cameraInfo.y-uniforms.cameraInfo.x);
#endif
#ifdef PREPASS_LOCAL_POSITION
vertexOutputs.vPosition=positionUpdated.xyz;
#endif
#if (defined(PREPASS_VELOCITY) || defined(PREPASS_VELOCITY_LINEAR)) && defined(BONES_VELOCITY_ENABLED)
vertexOutputs.vCurrentPosition=scene.viewProjection*worldPos;
#if NUM_BONE_INFLUENCERS>0
var previousInfluence: mat4x4f;previousInfluence=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndices[0])]*vertexInputs.matricesWeights[0];
#if NUM_BONE_INFLUENCERS>1
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndices[1])]*vertexInputs.matricesWeights[1];
#endif 
#if NUM_BONE_INFLUENCERS>2
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndices[2])]*vertexInputs.matricesWeights[2];
#endif 
#if NUM_BONE_INFLUENCERS>3
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndices[3])]*vertexInputs.matricesWeights[3];
#endif
#if NUM_BONE_INFLUENCERS>4
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndicesExtra[0])]*vertexInputs.matricesWeightsExtra[0];
#endif 
#if NUM_BONE_INFLUENCERS>5
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndicesExtra[1])]*vertexInputs.matricesWeightsExtra[1];
#endif 
#if NUM_BONE_INFLUENCERS>6
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndicesExtra[2])]*vertexInputs.matricesWeightsExtra[2];
#endif 
#if NUM_BONE_INFLUENCERS>7
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndicesExtra[3])]*vertexInputs.matricesWeightsExtra[3];
#endif
vertexOutputs.vPreviousPosition=uniforms.previousViewProjection*finalPreviousWorld*previousInfluence* vec4f(positionUpdated,1.0);
#else
vertexOutputs.vPreviousPosition=uniforms.previousViewProjection*finalPreviousWorld* vec4f(positionUpdated,1.0);
#endif
#endif
`;e.IncludesShadersStoreWGSL[v]||(e.IncludesShadersStoreWGSL[v]=O);const de={name:v,shader:O},u="uvVariableDeclaration",h=`#ifdef MAINUV{X}
#if !defined(UV{X})
var uv{X}: vec2f=vec2f(0.,0.);
#elif defined(USE_VERTEX_PULLING)
var uv{X}: vec2f=uv{X}Updated;
#else
var uv{X}: vec2f=vertexInputs.uv{X};
#endif
vertexOutputs.vMainUV{X}=uv{X};
#endif
`;e.IncludesShadersStoreWGSL[u]||(e.IncludesShadersStoreWGSL[u]=h);const oe={name:u,shader:h},l="samplerVertexImplementation",U=`#if defined(_DEFINENAME_) && _DEFINENAME_DIRECTUV==0
if (uniforms.v_INFONAME_==0.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(uvUpdated,1.0,0.0)).xy;}
#ifdef UV2
else if (uniforms.v_INFONAME_==1.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(uv2Updated,1.0,0.0)).xy;}
#endif
#ifdef UV3
else if (uniforms.v_INFONAME_==2.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(vertexInputs.uv3,1.0,0.0)).xy;}
#endif
#ifdef UV4
else if (uniforms.v_INFONAME_==3.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(vertexInputs.uv4,1.0,0.0)).xy;}
#endif
#ifdef UV5
else if (uniforms.v_INFONAME_==4.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(vertexInputs.uv5,1.0,0.0)).xy;}
#endif
#ifdef UV6
else if (uniforms.v_INFONAME_==5.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(vertexInputs.uv6,1.0,0.0)).xy;}
#endif
#endif
`;e.IncludesShadersStoreWGSL[l]||(e.IncludesShadersStoreWGSL[l]=U);const se={name:l,shader:U},p="bumpVertex",L=`#if defined(BUMP) || defined(PARALLAX) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#if defined(TANGENT) && defined(NORMAL)
var tbnNormal: vec3f=normalize(normalUpdated);var tbnTangent: vec3f=normalize(tangentUpdated.xyz);var tbnBitangent: vec3f=cross(tbnNormal,tbnTangent)*tangentUpdated.w;var matTemp= mat3x3f(finalWorld[0].xyz,finalWorld[1].xyz,finalWorld[2].xyz)* mat3x3f(tbnTangent,tbnBitangent,tbnNormal);vertexOutputs.vTBN0=matTemp[0];vertexOutputs.vTBN1=matTemp[1];vertexOutputs.vTBN2=matTemp[2];
#endif
#endif
`;e.IncludesShadersStoreWGSL[p]||(e.IncludesShadersStoreWGSL[p]=L);const ve={name:p,shader:L},c="shadowsVertex",y=`#ifdef SHADOWS
#if defined(SHADOWCSM{X})
#ifdef SCENE_UBO
vertexOutputs.vPositionFromCamera{X}=scene.view*worldPos;
#else
vertexOutputs.vPositionFromCamera{X}=uniforms.view*worldPos;
#endif
#if SHADOWCSMNUM_CASCADES{X}>0
vertexOutputs.vPositionFromLight{X}_0=uniforms.lightMatrix{X}[0]*worldPos;
#ifdef USE_REVERSE_DEPTHBUFFER
vertexOutputs.vDepthMetric{X}_0=(-vertexOutputs.vPositionFromLight{X}_0.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#else
vertexOutputs.vDepthMetric{X}_0= (vertexOutputs.vPositionFromLight{X}_0.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#endif
#endif
#if SHADOWCSMNUM_CASCADES{X}>1
vertexOutputs.vPositionFromLight{X}_1=uniforms.lightMatrix{X}[1]*worldPos;
#ifdef USE_REVERSE_DEPTHBUFFER
vertexOutputs.vDepthMetric{X}_1=(-vertexOutputs.vPositionFromLight{X}_1.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#else
vertexOutputs.vDepthMetric{X}_1= (vertexOutputs.vPositionFromLight{X}_1.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#endif
#endif 
#if SHADOWCSMNUM_CASCADES{X}>2
vertexOutputs.vPositionFromLight{X}_2=uniforms.lightMatrix{X}[2]*worldPos;
#ifdef USE_REVERSE_DEPTHBUFFER
vertexOutputs.vDepthMetric{X}_2=(-vertexOutputs.vPositionFromLight{X}_2.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#else
vertexOutputs.vDepthMetric{X}_2= (vertexOutputs.vPositionFromLight{X}_2.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#endif
#endif 
#if SHADOWCSMNUM_CASCADES{X}>3
vertexOutputs.vPositionFromLight{X}_3=uniforms.lightMatrix{X}[3]*worldPos;
#ifdef USE_REVERSE_DEPTHBUFFER
vertexOutputs.vDepthMetric{X}_3=(-vertexOutputs.vPositionFromLight{X}_3.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#else
vertexOutputs.vDepthMetric{X}_3= (vertexOutputs.vPositionFromLight{X}_3.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#endif
#endif 
#elif defined(SHADOW{X}) && !defined(SHADOWCUBE{X})
vertexOutputs.vPositionFromLight{X}=uniforms.lightMatrix{X}*worldPos;
#ifdef USE_REVERSE_DEPTHBUFFER
vertexOutputs.vDepthMetric{X}=(-vertexOutputs.vPositionFromLight{X}.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#else
vertexOutputs.vDepthMetric{X}=(vertexOutputs.vPositionFromLight{X}.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#endif
#endif
#endif
`;e.IncludesShadersStoreWGSL[c]||(e.IncludesShadersStoreWGSL[c]=y);const ue={name:c,shader:y},_="logDepthVertex",g=`#ifdef LOGARITHMICDEPTH
vertexOutputs.vFragmentDepth=1.0+vertexOutputs.position.w;vertexOutputs.position.z=log2(max(0.000001,vertexOutputs.vFragmentDepth))*uniforms.logarithmicDepthConstant;
#endif
`;e.IncludesShadersStoreWGSL[_]||(e.IncludesShadersStoreWGSL[_]=g);const le={name:_,shader:g},m="defaultVertexShader",M=`#include<defaultUboDeclaration>
#define CUSTOM_VERTEX_BEGIN
#ifndef USE_VERTEX_PULLING
attribute position: vec3f;
#ifdef NORMAL
attribute normal: vec3f;
#endif
#ifdef TANGENT
attribute tangent: vec4f;
#endif
#ifdef UV1
attribute uv: vec2f;
#endif
#include<uvAttributeDeclaration>[2..7]
#ifdef VERTEXCOLOR
attribute color: vec4f;
#endif
#endif
#include<helperFunctions>
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
#include<prePassVertexDeclaration>
#include<mainUVVaryingDeclaration>[1..7]
#include<samplerVertexDeclaration>(_DEFINENAME_,DIFFUSE,_VARYINGNAME_,Diffuse)
#include<samplerVertexDeclaration>(_DEFINENAME_,DETAIL,_VARYINGNAME_,Detail)
#include<samplerVertexDeclaration>(_DEFINENAME_,AMBIENT,_VARYINGNAME_,Ambient)
#include<samplerVertexDeclaration>(_DEFINENAME_,OPACITY,_VARYINGNAME_,Opacity)
#include<samplerVertexDeclaration>(_DEFINENAME_,EMISSIVE,_VARYINGNAME_,Emissive)
#include<samplerVertexDeclaration>(_DEFINENAME_,LIGHTMAP,_VARYINGNAME_,Lightmap)
#if defined(SPECULARTERM)
#include<samplerVertexDeclaration>(_DEFINENAME_,SPECULAR,_VARYINGNAME_,Specular)
#endif
#include<samplerVertexDeclaration>(_DEFINENAME_,BUMP,_VARYINGNAME_,Bump)
#include<samplerVertexDeclaration>(_DEFINENAME_,DECAL,_VARYINGNAME_,Decal)
varying vPositionW: vec3f;
#ifdef NORMAL
varying vNormalW: vec3f;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vColor: vec4f;
#endif
#include<bumpVertexDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#include<__decl__lightVxFragment>[0..maxSimultaneousLights]
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#ifdef REFLECTIONMAP_SKYBOX
varying vPositionUVW: vec3f;
#endif
#if defined(REFLECTIONMAP_EQUIRECTANGULAR_FIXED) || defined(REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED)
varying vDirectionW: vec3f;
#endif
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying vViewDepth: f32;
#endif
#include<logDepthDeclaration>
#include<vertexPullingDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
#ifdef USE_VERTEX_PULLING
var positionUpdated: vec3f=vec3f(0.0);
#ifdef NORMAL
var normalUpdated: vec3f=vec3f(0.0);
#endif
#ifdef TANGENT
var tangentUpdated: vec4f=vec4f(0.0);
#endif
#ifdef UV1
var uvUpdated: vec2f=vec2f(0.0);
#endif
#ifdef UV2
var uv2Updated: vec2f=vec2f(0.0);
#endif
#ifdef VERTEXCOLOR
var colorUpdated: vec4f=vec4f(0.0);
#endif
#else
var positionUpdated: vec3f=vertexInputs.position;
#ifdef NORMAL
var normalUpdated: vec3f=vertexInputs.normal;
#endif
#ifdef TANGENT
var tangentUpdated: vec4f=vertexInputs.tangent;
#endif
#ifdef UV1
var uvUpdated: vec2f=vertexInputs.uv;
#endif
#ifdef UV2
var uv2Updated: vec2f=vertexInputs.uv2;
#endif
#ifdef VERTEXCOLOR
var colorUpdated: vec4f=vertexInputs.color;
#endif
#endif
#include<vertexPullingVertex>
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#ifdef REFLECTIONMAP_SKYBOX
vertexOutputs.vPositionUVW=positionUpdated;
#endif
#define CUSTOM_VERTEX_UPDATE_POSITION
#define CUSTOM_VERTEX_UPDATE_NORMAL
#include<instancesVertex>
#if defined(PREPASS) && ((defined(PREPASS_VELOCITY) || defined(PREPASS_VELOCITY_LINEAR)) && !defined(BONES_VELOCITY_ENABLED)
vertexOutputs.vCurrentPosition=scene.viewProjection*finalWorld*vec4f(positionUpdated,1.0);vertexOutputs.vPreviousPosition=uniforms.previousViewProjection*finalPreviousWorld*vec4f(positionUpdated,1.0);
#endif
#ifdef USE_VERTEX_PULLING
#include<bonesVertex>(vertexInputs.matricesIndices,vp_matricesIndices,vertexInputs.matricesWeights,vp_matricesWeights,vertexInputs.matricesIndicesExtra,vp_matricesIndicesExtra,vertexInputs.matricesWeightsExtra,vp_matricesWeightsExtra)
#include<bakedVertexAnimation>(vertexInputs.matricesIndices,vp_matricesIndices,vertexInputs.matricesWeights,vp_matricesWeights,vertexInputs.matricesIndicesExtra,vp_matricesIndicesExtra,vertexInputs.matricesWeightsExtra,vp_matricesWeightsExtra)
#else
#include<bonesVertex>
#include<bakedVertexAnimation>
#endif
var worldPos: vec4f=finalWorld*vec4f(positionUpdated,1.0);
#ifdef NORMAL
var normalWorld: mat3x3f= mat3x3f(finalWorld[0].xyz,finalWorld[1].xyz,finalWorld[2].xyz);
#if defined(INSTANCES) && defined(THIN_INSTANCES)
vertexOutputs.vNormalW=normalUpdated/ vec3f(dot(normalWorld[0],normalWorld[0]),dot(normalWorld[1],normalWorld[1]),dot(normalWorld[2],normalWorld[2]));vertexOutputs.vNormalW=normalize(normalWorld*vertexOutputs.vNormalW);
#else
#ifdef NONUNIFORMSCALING
normalWorld=transposeMat3(inverseMat3(normalWorld));
#endif
vertexOutputs.vNormalW=normalize(normalWorld*normalUpdated);
#endif
#endif
#define CUSTOM_VERTEX_UPDATE_WORLDPOS
#ifdef MULTIVIEW
if (gl_ViewID_OVR==0u) {vertexOutputs.position=scene.viewProjection*worldPos;} else {vertexOutputs.position=scene.viewProjectionR*worldPos;}
#else
vertexOutputs.position=scene.viewProjection*worldPos;
#endif
vertexOutputs.vPositionW= worldPos.xyz;
#ifdef PREPASS
#include<prePassVertex>
#endif
#if defined(REFLECTIONMAP_EQUIRECTANGULAR_FIXED) || defined(REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED)
vertexOutputs.vDirectionW=normalize((finalWorld* vec4f(positionUpdated,0.0)).xyz);
#endif
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
#ifdef RIGHT_HANDED
vertexOutputs.vViewDepth=-(scene.view*worldPos).z;
#else
vertexOutputs.vViewDepth=(scene.view*worldPos).z;
#endif
#endif
#ifndef UV1
var uvUpdated: vec2f=vec2f(0.,0.);
#endif
#ifdef MAINUV1
vertexOutputs.vMainUV1=uvUpdated;
#endif
#ifndef UV2
var uv2Updated: vec2f=vec2f(0.,0.);
#endif
#ifdef MAINUV2
vertexOutputs.vMainUV2=uv2Updated;
#endif
#include<uvVariableDeclaration>[3..7]
#include<samplerVertexImplementation>(_DEFINENAME_,DIFFUSE,_VARYINGNAME_,Diffuse,_MATRIXNAME_,diffuse,_INFONAME_,DiffuseInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,DETAIL,_VARYINGNAME_,Detail,_MATRIXNAME_,detail,_INFONAME_,DetailInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,AMBIENT,_VARYINGNAME_,Ambient,_MATRIXNAME_,ambient,_INFONAME_,AmbientInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,OPACITY,_VARYINGNAME_,Opacity,_MATRIXNAME_,opacity,_INFONAME_,OpacityInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,EMISSIVE,_VARYINGNAME_,Emissive,_MATRIXNAME_,emissive,_INFONAME_,EmissiveInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,LIGHTMAP,_VARYINGNAME_,Lightmap,_MATRIXNAME_,lightmap,_INFONAME_,LightmapInfos.x)
#if defined(SPECULARTERM)
#include<samplerVertexImplementation>(_DEFINENAME_,SPECULAR,_VARYINGNAME_,Specular,_MATRIXNAME_,specular,_INFONAME_,SpecularInfos.x)
#endif
#include<samplerVertexImplementation>(_DEFINENAME_,BUMP,_VARYINGNAME_,Bump,_MATRIXNAME_,bump,_INFONAME_,BumpInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,DECAL,_VARYINGNAME_,Decal,_MATRIXNAME_,decal,_INFONAME_,DecalInfos.x)
#include<bumpVertex>
#include<clipPlaneVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#include<vertexColorMixing>
#include<logDepthVertex>
#define CUSTOM_VERTEX_MAIN_END
}
`;e.ShadersStoreWGSL[m]||(e.ShadersStoreWGSL[m]=M);const pe=[P,D,R,J,b,F,G,z,ee,X,te,ie,C,$,ae,re,Q,K,W,ne,fe,Z,q,B,w,H,de,oe,se,ve,Y,j,ue,k,le];for(const t of pe)e.IncludesShadersStoreWGSL[t.name]||(e.IncludesShadersStoreWGSL[t.name]=t.shader);const Ae={name:m,shader:M};export{Ae as defaultVertexShaderWGSL};
